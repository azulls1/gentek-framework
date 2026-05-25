import kleur from 'kleur';

export const logger = {
  info: (msg: string) => console.log(msg),
  dim: (msg: string) => console.log(kleur.gray(msg)),
  success: (msg: string) => console.log(kleur.green(msg)),
  warn: (msg: string) => console.log(kleur.yellow(msg)),
  error: (msg: string) => console.error(kleur.red(msg)),
  header: (msg: string) => console.log(kleur.bold().cyan(msg)),
};
