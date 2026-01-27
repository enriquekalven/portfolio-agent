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

import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * A2UI ProfileBubble Component
 * 
 * A premium circular avatar with a glassmorphic ring and subtle animations.
 */
@customElement("a2ui-profile-bubble")
export class ProfileBubble extends LitElement {
  @property({ attribute: false })
  image: any = "/assets/hero.png";

  @property({ attribute: false })
  size: any = "200px";

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 0;
      width: 100%;
    }

    .bubble-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .glass-ring {
      position: absolute;
      width: calc(100% + 24px);
      height: calc(100% + 24px);
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(66, 133, 244, 0.4), rgba(161, 0, 255, 0.4));
      filter: blur(8px);
      animation: rotate 10s linear infinite;
      z-index: 0;
    }

    .bubble {
      position: relative;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      z-index: 1;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .bubble:hover {
      transform: scale(1.05) translateY(-5px);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;

  private resolveStringValue(value: any): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if ("literalString" in value) return value.literalString;
      if ("literal" in value) return String(value.literal);
    }
    return String(value);
  }

  render() {
    const imageUrl = this.resolveStringValue(this.image);
    const sizeDim = this.resolveStringValue(this.size);

    return html`
      <div class="bubble-container" style="width: ${sizeDim}; height: ${sizeDim};">
        <div class="glass-ring"></div>
        <div class="bubble" style="width: ${sizeDim}; height: ${sizeDim};">
          <img src="${imageUrl}" alt="Profile">
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a2ui-profile-bubble": ProfileBubble;
  }
}
