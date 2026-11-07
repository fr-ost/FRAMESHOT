import { defineBackground } from 'wxt/utils/define-background';
import { registerBackground } from '../background/main';

export default defineBackground({
  type: 'module',
  main() {
    registerBackground();
  },
});
