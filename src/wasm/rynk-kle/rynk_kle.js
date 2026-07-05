/* @ts-self-types="./rynk_kle.d.ts" */
import * as wasm from "./rynk_kle_bg.wasm";
import { __wbg_set_wasm } from "./rynk_kle_bg.js";

__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    convert_kle, decode_layout, keyboard_toml_to_vial
} from "./rynk_kle_bg.js";
