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
import { customElement, property, state } from "lit/decorators.js";

/**
 * A2UI PortfolioCard Component
 * 
 * A clickable card for blogs, videos, or projects.
 * Supports image/thumbnail and opens a URL on click.
 */
@customElement("a2ui-portfolio-card")
export class PortfolioCard extends LitElement {
  @property({ attribute: false })
  title: any = "";

  @property({ attribute: false })
  description: any = "";

  @property({ attribute: false })
  image: any = "";

  @property({ attribute: false })
  url: any = "";

  @property({ type: String })
  type: 'blog' | 'video' | 'project' = 'project';

  @state()
  private isPlaying = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 340px;
      margin-bottom: 24px;
    }

    .card {
      background: var(--chat-bg, #1e1f20);
      border: 1px solid var(--border-color, #3c4043);
      border-radius: 20px;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      height: 100%;
      display: flex;
      flex-direction: column;
      cursor: pointer;
    }

    .card:hover {
      transform: translateY(-8px);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
      border-color: #4285F4;
    }

    .media-container {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s;
    }

    .card:hover .thumbnail {
      transform: scale(1.08);
    }

    .video-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 64px;
      height: 64px;
      background: rgba(66, 133, 244, 0.95);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      border: 3px solid white;
      transition: transform 0.2s;
    }

    .card:hover .video-overlay {
      transform: translate(-50%, -50%) scale(1.1);
    }

    .content {
      padding: 18px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .badge {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 8px;
      letter-spacing: 1px;
    }

    .badge-blog { background: rgba(161, 0, 255, 0.15); color: #A100FF; border: 1px solid rgba(161, 0, 255, 0.3); }
    .badge-video { background: rgba(255, 0, 0, 0.15); color: #FF4444; border: 1px solid rgba(255, 0, 0, 0.3); }
    .badge-project { background: rgba(66, 133, 244, 0.15); color: #4285F4; border: 1px solid rgba(66, 133, 244, 0.3); }

    .title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #e3e3e3);
      line-height: 1.3;
      margin-bottom: 10px;
      letter-spacing: -0.4px;
    }

    .description {
      font-size: 14px;
      color: var(--text-secondary, #9aa0a6);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
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
    const title = this.resolveStringValue(this.title);
    const description = this.resolveStringValue(this.description);
    const image = this.resolveStringValue(this.image);
    const url = this.resolveStringValue(this.url);

    return html`
      <div class="card" @click=${this._handleClick}>
        <div class="media-container">
          ${this.isPlaying && this.type === 'video' ? html`
            <iframe 
              src="${this._getEmbedUrl(url)}" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          ` : html`
            ${image ? html`
              <img src="${image}" class="thumbnail" alt="${title}">
            ` : html`
              <div class="thumbnail" style="background: linear-gradient(135deg, #1e293b, #0f172a);"></div>
            `}
            
            ${this.type === 'video' ? html`
              <div class="video-overlay">
                <span class="material-symbols-outlined" style="font-size: 36px">play_arrow</span>
              </div>
            ` : nothing}
          `}
        </div>

        <div class="content">
          <div class="header-row">
            <span class="badge badge-${this.type}">${this.type}</span>
          </div>
          <div class="title">${title}</div>
          <div class="description">${description}</div>
        </div>
      </div>
    `;
  }

  private _getEmbedUrl(url: string) {
    if (!url) return "";
    const youtubeVideoRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeVideoRegex);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url;
  }

  private _handleClick() {
    const url = this.resolveStringValue(this.url);
    if (this.type === 'video') {
      // For videos, clicking the card toggles embedding
      this.isPlaying = !this.isPlaying;
      // If we are stopping playback, or if the user clicks again, maybe they want to open in new tab?
      // Let's keep it simple: first click toggles embed.
    } else if (url) {
      window.open(url, '_blank');
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a2ui-portfolio-card": PortfolioCard;
  }
}
