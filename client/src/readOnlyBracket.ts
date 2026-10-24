// Must come first: the modules below read storage while they are still being evaluated.
import "./safeStorage";

import ReadOnlyBracket from "./ReadOnlyBracket.vue";
import { createCommonApp } from "./appCommon";

const app = createCommonApp(ReadOnlyBracket);
app.mount("#main-vue");
