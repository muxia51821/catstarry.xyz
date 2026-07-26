import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.') || /\.[a-z0-9]+$/i.test(specifier)) throw error;
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (!existsSync(fileURLToPath(candidate))) throw error;
      return { shortCircuit: true, url: candidate.href };
    }
  },
});
