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

import { html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Root } from "./root";
import { classMap } from "lit/directives/class-map.js";
import * as Types from "@a2ui/web_core/types/types";
import { styleMap } from "lit/directives/style-map.js";
import { structuralStyles } from "./styles";

@customElement("a2ui-row")
export class Row extends Root {
  @property({ reflect: true, type: String })
  alignment: Types.ResolvedRow["alignment"] = "stretch";

  @property({ reflect: true, type: String })
  distribution: Types.ResolvedRow["distribution"] = "start";

  static styles = [
    structuralStyles,
    css`
      * {
        box-sizing: border-box;
      }

      :host {
        display: flex;
        flex: var(--weight);
      }

      section {
        display: flex;
        flex-direction: row;
        width: 100%;
        min-height: 100%;
        overflow-x: auto;
        scroll-behavior: smooth;
        gap: 16px;
        padding-bottom: 8px; /* Space for scrollbar if it appears or to avoid clipping shadows */
      }

      section::-webkit-scrollbar {
        height: 6px;
      }

      section::-webkit-scrollbar-track {
        background: transparent;
      }

      section::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }

      section:hover::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }

      :host([alignment="start"]) section {
        align-items: start;
      }

      :host([alignment="center"]) section {
        align-items: center;
      }

      :host([alignment="end"]) section {
        align-items: end;
      }

      :host([alignment="stretch"]) section {
        align-items: stretch;
      }

      :host([distribution="start"]) section {
        justify-content: start;
      }

      :host([distribution="center"]) section {
        justify-content: center;
      }

      :host([distribution="end"]) section {
        justify-content: end;
      }

      :host([distribution="spaceBetween"]) section {
        justify-content: space-between;
      }

      :host([distribution="spaceAround"]) section {
        justify-content: space-around;
      }

      :host([distribution="spaceEvenly"]) section {
        justify-content: space-evenly;
      }
      section ::slotted(*) {
        flex-shrink: 0;
      }
    `,
  ];

  render() {
    return html`<section
      class=${classMap(this.theme.components.Row)}
      style=${this.theme.additionalStyles?.Row
        ? styleMap(this.theme.additionalStyles?.Row)
        : nothing}
    >
      <slot></slot>
    </section>`;
  }
}
