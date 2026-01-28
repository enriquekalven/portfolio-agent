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

import { html, css, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

interface MatrixCell {
  id: string;
  phase: string;
  role: string;
  highlights: string[];
  impact: string;
  color: string;
  logo: string;
}

/**
 * A2UI StrategicMatrix Component
 * 
 * Renders a high-fidelity strategic breakdown grid.
 * Used for "Strategic Integration Matrix" and other framework displays.
 */
@customElement("a2ui-strategic-matrix")
export class StrategicMatrix extends LitElement {
  @property({ type: String })
  title: string = "";

  @property({ type: Array })
  cells: MatrixCell[] = [];

  static styles = css`
    :host {
      display: block;
      width: 100%;
      margin-bottom: 32px;
      animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .container {
      background: rgba(30, 31, 32, 0.4);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: 24px;
      padding: 32px;
      backdrop-filter: blur(12px);
    }

    /* Light Mode */
    :host-context(.light-mode) .container {
      background: white;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
    }

    .title {
      font-size: 24px;
      font-weight: 500;
      color: white;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
      text-align: center;
    }

    :host-context(.light-mode) .title {
      color: #1a1a1b;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .cell {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      padding: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    :host-context(.light-mode) .cell {
      background: #f8f9fa;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .cell:hover {
      transform: translateY(-8px);
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(66, 133, 244, 0.4);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }

    :host-context(.light-mode) .cell:hover {
      background: white;
      border-color: rgba(66, 133, 244, 0.3);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
    }

    .cell-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .icon-container {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
    }

    .material-symbols-outlined {
      font-size: 20px;
    }

    .phase-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.6;
    }

    .role-title {
      font-size: 18px;
      font-weight: 600;
      color: white;
      margin-bottom: 12px;
    }

    :host-context(.light-mode) .role-title {
      color: #202124;
    }

    .highlights {
      margin: 0 0 16px 0;
      padding-left: 18px;
      list-style-type: none;
      flex: 1;
    }

    .highlights li {
      font-size: 14px;
      color: var(--text-secondary, #9aa0a6);
      margin-bottom: 8px;
      line-height: 1.4;
      position: relative;
    }

    .highlights li::before {
      content: "•";
      position: absolute;
      left: -18px;
      color: var(--cell-color);
      font-weight: bold;
    }

    .impact-footer {
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
      line-height: 1.4;
      color: white;
      font-weight: 500;
      opacity: 0.9;
    }

    :host-context(.light-mode) .impact-footer {
      border-top-color: rgba(0, 0, 0, 0.05);
      color: #3c4043;
    }

    .accent-glow {
      position: absolute;
      top: 0;
      right: 0;
      width: 60px;
      height: 60px;
      background: var(--cell-color);
      filter: blur(40px);
      opacity: 0.15;
      pointer-events: none;
    }
  `;

  render() {
    return html`
      <div class="container">
        ${this.title ? html`<div class="title">${this.title}</div>` : nothing}
        <div class="grid">
          ${this.cells.map(cell => html`
            <div class="cell" style="--cell-color: ${cell.color}">
              <div class="accent-glow"></div>
              <div class="cell-header">
                <div class="icon-container" style="color: ${cell.color}; background: ${this._getTransparentColor(cell.color)}">
                  <span class="material-symbols-outlined">${cell.logo}</span>
                </div>
                <div class="phase-label" style="color: ${cell.color}">${cell.phase}</div>
              </div>
              <div class="role-title">${cell.role}</div>
              <ul class="highlights">
                ${cell.highlights.map(h => html`<li>${h}</li>`)}
              </ul>
              <div class="impact-footer">
                ${cell.impact}
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _getTransparentColor(hex: string): string {
    // Basic hex transparency conversion
    if (hex.startsWith('#')) {
      return hex + '1a'; // 10% opacity in hex
    }
    return 'rgba(66, 133, 244, 0.1)';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a2ui-strategic-matrix": StrategicMatrix;
  }
}
