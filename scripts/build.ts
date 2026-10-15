import './prepare-covers.ts';

const hugo = Bun.spawn(['hugo', ...process.argv.slice(2)], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
});

process.exit(await hugo.exited);
