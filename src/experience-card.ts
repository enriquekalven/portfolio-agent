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

/**
 * A2UI ExperienceCard Component
 * 
 * Renders a professional experience entry as part of a timeline.
 */
@customElement("a2ui-experience-card")
export class ExperienceCard extends LitElement {
  @property({ type: String })
  company: string = "";

  @property({ type: String })
  role: string = "";

  @property({ type: String })
  period: string = "";

  @property({ type: String })
  logo: string = ""; // "google", "aws", "accenture"

  @property({ type: Array })
  highlights: string[] = [];

  @property({ type: String })
  impact: string = "";

  @property({ type: String })
  color: string = "#4285F4";

  static styles = css`
    :host {
      display: block;
      margin-bottom: 24px;
      position: relative;
      animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .card {
      background: rgba(30, 31, 32, 0.4);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: 24px;
      padding: 32px;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(12px);
    }

    /* Light Mode Overrides */
    :host-context(.light-mode) .card {
      background: white;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
    }

    :host-context(.light-mode) .company,
    :host-context(.light-mode) .impact-text {
      color: #1a1a1b;
    }

    :host-context(.light-mode) .highlights li {
      color: #3c4043;
    }

    :host-context(.light-mode) .logo-container {
      background: #f8f9fa;
      border-color: #dadce0;
    }

    :host-context(.light-mode) .impact-box {
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.03) 0%, transparent 100%);
    }

    .card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      opacity: 0.6;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .logo-container {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .logo-icon {
      font-size: 32px;
      font-weight: 800;
    }

    .info {
      flex: 1;
    }

    .company {
      font-size: 22px;
      font-weight: 500;
      color: white;
      letter-spacing: -0.5px;
    }

    .role-period {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      color: var(--text-secondary, #9aa0a6);
      margin-top: 6px;
    }

    .highlights {
      margin: 20px 0;
      padding-left: 20px;
      list-style-type: none;
    }

    .highlights li {
      margin-bottom: 12px;
      font-size: 16px;
      line-height: 1.6;
      color: var(--text-primary, #e3e3e3);
      position: relative;
    }

    .highlights li::before {
      content: "•";
      position: absolute;
      left: -20px;
      color: var(--accent-color);
      font-weight: bold;
      opacity: 0.8;
    }

    .impact-box {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
      border-radius: 16px;
      padding: 20px;
      margin-top: 24px;
      border-left: 4px solid var(--accent-color);
      position: relative;
    }

    .impact-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--accent-color);
      margin-bottom: 8px;
    }

    .impact-text {
      font-size: 15px;
      font-weight: 500;
      color: white;
      line-height: 1.5;
    }

    /* Logo Specifics */
    .google-logo { color: #4285F4; }
    .aws-logo { color: #FF9900; }
    .accenture-logo { color: #A100FF; }
  `;

  render() {
    return html`
      <div class="card" style="--accent-color: ${this.color}">
        <div class="accent-bar" style="background: ${this.color}"></div>
        <div class="header">
          <div class="logo-container">
            ${this._renderLogo()}
          </div>
          <div class="info">
            <div class="company">${this.company}</div>
            <div class="role-period">
              <span>${this.role}</span>
              <span style="font-weight: 500; opacity: 0.8;">${this.period}</span>
            </div>
          </div>
        </div>

        <ul class="highlights">
          ${this.highlights.map(h => html`<li>${h}</li>`)}
        </ul>

        ${this.impact ? html`
          <div class="impact-box">
            <div class="impact-label">Key Achievement & Impact</div>
            <div class="impact-text">${this.impact}</div>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderLogo() {
    const l = this.logo.toLowerCase();
    if (l === 'google') return html`<span class="logo-icon google-logo">G</span>`;
    if (l === 'aws') return html`<span class="logo-icon aws-logo">A</span>`;
    if (l === 'accenture') return html`<span class="logo-icon accenture-logo">>_</span>`;
    return html`<span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-secondary)">business</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a2ui-experience-card": ExperienceCard;
  }
}
