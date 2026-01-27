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

export type TagName = keyof A2UITagNameMap;

// A type that describes a constructor function which returns an instance of T
export type CustomElementConstructorOf<T extends HTMLElement> = {
  // The 'new' signature ensures it can be instantiated
  new (): T;
} & typeof HTMLElement;

import { Audio } from "./audio";
import { Button } from "./button";
import { Card } from "./card";
import { Checkbox } from "./checkbox";
import { Column } from "./column";
import { DateTimeInput } from "./datetime-input";
import { Divider } from "./divider";
import { Icon } from "./icon";
import { Image } from "./image";
import { List } from "./list";
import { MultipleChoice } from "./multiple-choice";
import { Modal } from "./modal";
import { Root } from "./root";
import { Row } from "./row";
import { Slider } from "./slider";
import { Surface } from "./surface";
import { Tabs } from "./tabs";
import { TextField } from "./text-field";
import { Text } from "./text";
import { Video } from "./video";

export * as Context from "./context/theme";
export * as Utils from "./utils/utils";
export { ComponentRegistry, componentRegistry } from "./component-registry";
export { registerCustomComponents } from "./custom-components/index";

export {
  Audio,
  Button,
  Card,
  Column,
  Checkbox,
  DateTimeInput,
  Divider,
  Icon,
  Image,
  List,
  MultipleChoice,
  Modal,
  Row,
  Slider,
  Root,
  Surface,
  Tabs,
  Text,
  TextField,
  Video,
};

interface A2UITagNameMap {
  "a2ui-audioplayer": Audio;
  "a2ui-button": Button;
  "a2ui-card": Card;
  "a2ui-checkbox": Checkbox;
  "a2ui-column": Column;
  "a2ui-datetimeinput": DateTimeInput;
  "a2ui-divider": Divider;
  "a2ui-icon": Icon;
  "a2ui-image": Image;
  "a2ui-list": List;
  "a2ui-modal": Modal;
  "a2ui-multiplechoice": MultipleChoice;
  "a2ui-root": Root;
  "a2ui-row": Row;
  "a2ui-slider": Slider;
  "a2ui-surface": Surface;
  "a2ui-tabs": Tabs;
  "a2ui-text": Text;
  "a2ui-textfield": TextField;
  "a2ui-video": Video;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLElementTagNameMap extends A2UITagNameMap {}
}

/**
 * Type-safely retrieves a custom element constructor using the tagName map.
 * @param tagName The tag name to look up (must exist in HTMLElementTagNameMap).
 * @returns The specific constructor type or undefined.
 */
export function instanceOf<T extends keyof A2UITagNameMap>(tagName: T) {
  // Use a type assertion: we tell TypeScript to trust that the value returned
  // by customElements.get(tagName) matches the type defined in our map.
  const ctor = customElements.get(tagName) as
    | CustomElementConstructorOf<A2UITagNameMap[T]>
    | undefined;
  if (!ctor) {
    console.warn("No element definition for", tagName);
    return;
  }

  return new ctor();
}
