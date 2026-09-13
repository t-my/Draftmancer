// Must come first: the modules below read storage while they are still being evaluated.
import "./safeStorage";

import AppComponent from "./App.vue";
import { createCommonApp } from "./appCommon";

import SortableJS, { MultiDrag } from "sortablejs";
SortableJS.mount(new MultiDrag());

const app = createCommonApp(AppComponent);
app.mount("#main-vue");
