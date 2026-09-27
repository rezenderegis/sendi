import { Injectable } from '@nestjs/common';

const NOMES = ['Ana Silva', 'Bruno Costa', 'Carla Souza', 'Daniel Oliveira', 'Elaine Santos', 'Fábio Lima', 'Gabriela Alves', 'Hugo Pereira'];
const CIDADES = ['São Paulo - SP', 'Rio de Janeiro - RJ', 'Belo Horizonte - MG', 'Curitiba - PR', 'Porto Alegre - RS', 'Salvador - BA', 'Recife - PE', 'Fortaleza - CE'];
const BAIRROS = ['Centro', 'Jardim América', 'Vila Nova', 'Boa Vista'];
const LOGRADOUROS = ['das Flores', 'Sete de Setembro', 'Brasil', 'XV de Novembro'];
const HORARIOS = ['09:00', '10:30', '11:00', '14:00', '15:30', '16:00'];

function seedFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

/**
 * Dados sempre fake, gerados de forma determinística a partir do CPF/CEP recebido — o mesmo
 * valor de entrada sempre devolve a mesma resposta, então dá pra roteirizar uma demo (ex: sempre
 * usar o mesmo CPF de exemplo) ou escrever um teste automatizado que compara contra um valor fixo.
 */
@Injectable()
export class MockApiService {
  cliente(cpf: string) {
    const seed = seedFromString(cpf);
    const ativo = seed % 4 !== 0;
    return {
      cpf,
      nome: pick(NOMES, seed),
      status: ativo ? 'ativo' : 'inativo',
      plano: pick(['Básico', 'Padrão', 'Premium'], seed, 1),
      dataCadastro: `20${18 + (seed % 6)}-0${1 + (seed % 9)}-15`,
    };
  }

  parcelas(cpf: string) {
    const seed = seedFromString(cpf);
    const quantidade = 1 + (seed % 3);
    const parcelasEmAtraso = Array.from({ length: quantidade }, (_, i) => ({
      numero: i + 1,
      valor: Number((80 + ((seed + i * 37) % 300)).toFixed(2)),
      vencimento: `2026-0${1 + ((seed + i) % 9)}-${10 + i * 5}`,
      diasAtraso: 10 + ((seed + i * 13) % 60),
    }));
    return { cpf, parcelasEmAtraso };
  }

  cidades(uf?: string) {
    const cidades = uf ? CIDADES.filter((c) => c.toLowerCase().endsWith(`- ${uf.toLowerCase()}`)) : CIDADES;
    return { cidades };
  }

  boleto(cpf: string, parcela: string) {
    const seed = seedFromString(`${cpf}-${parcela}`);
    return {
      cpf,
      parcela,
      linkBoleto: `https://boleto.exemplo.com.br/${seed}`,
      linhaDigitavel: `341.${seed % 100000}.${(seed * 7) % 100000} 0`,
      valor: Number((80 + (seed % 300)).toFixed(2)),
      vencimento: `2026-1${seed % 2}-2${seed % 8}`,
    };
  }

  negociacao(cpf: string, valor: number) {
    const seed = seedFromString(cpf);
    const percentualDesconto = 10 + (seed % 30);
    const valorComDesconto = Number((valor * (1 - percentualDesconto / 100)).toFixed(2));
    return {
      cpf,
      valorOriginal: valor,
      percentualDesconto,
      valorComDesconto,
      condicoes: 'Pagamento à vista via PIX, proposta válida por 48h',
    };
  }

  cep(cep: string) {
    const seed = seedFromString(cep);
    const cidadeUf = pick(CIDADES, seed, 3).split(' - ');
    return {
      cep,
      logradouro: `Rua ${pick(LOGRADOUROS, seed)}`,
      bairro: pick(BAIRROS, seed, 2),
      cidade: cidadeUf[0],
      uf: cidadeUf[1],
    };
  }

  horarios() {
    return { horariosDisponiveis: HORARIOS };
  }
}
