/*
 Copyright 2025 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import { behavior } from "./behavior";
import { border } from "./border";
import { colors } from "./colors";
import { icons } from "./icons";
import { layout } from "./layout";
import { opacity } from "./opacity";
import { type } from "./type";

export * from "./utils";

export const structuralStyles: string = [
  behavior,
  border,
  colors,
  icons,
  layout,
  opacity,
  type,
]
  .flat(Infinity)
  .join("\n");
