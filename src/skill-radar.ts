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

interface SkillEntry {
  subject: string;
  value: number;
}

/**
 * A2UI SkillRadar Component
 * 
 * Renders a premium radar chart (spider chart) using SVG.
 * Used for visualizing skill proficiencies.
 */
@customElement("a2ui-skill-radar")
export class SkillRadar extends LitElement {
  @property({ type: String })
  title: string = "Technical Proficiency";

  @property({ type: Array })
  skills: SkillEntry[] = [
    { subject: 'AI/ML', value: 95 },
    { subject: 'Data', value: 90 },
    { subject: 'Cloud', value: 98 },
    { subject: 'Strategy', value: 85 },
    { subject: 'Product', value: 88 },
  ];

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 500px;
      margin: 0 auto 32px;
      animation: zoomIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .container {
      background: rgba(30, 31, 32, 0.4);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: 24px;
      padding: 32px;
      backdrop-filter: blur(12px);
      text-align: center;
    }

    :host-context(.light-mode) .container {
      background: white;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
    }

    .title {
      font-size: 20px;
      font-weight: 500;
      color: white;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }

    :host-context(.light-mode) .title {
      color: #202124;
    }

    svg {
      width: 100%;
      height: auto;
      max-width: 350px;
      overflow: visible;
    }

    .axis {
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 1;
    }

    :host-context(.light-mode) .axis {
      stroke: rgba(0, 0, 0, 0.1);
    }

    .grid-line {
      fill: none;
      stroke: rgba(255, 255, 255, 0.05);
      stroke-width: 1;
    }

    :host-context(.light-mode) .grid-line {
      stroke: rgba(0, 0, 0, 0.05);
    }

    .radar-area {
      fill: rgba(66, 133, 244, 0.3);
      stroke: #4285F4;
      stroke-width: 2;
      filter: drop-shadow(0 0 8px rgba(66, 133, 244, 0.5));
    }

    .radar-point {
      fill: #4285F4;
      stroke: white;
      stroke-width: 1.5;
    }

    .label {
      font-size: 12px;
      fill: #9aa0a6;
      font-weight: 500;
    }

    :host-context(.light-mode) .label {
      fill: #5f6368;
    }
  `;

  render() {
    const size = 300;
    const center = size / 2;
    const radius = size * 0.4;
    const angleStep = (Math.PI * 2) / this.skills.length;

    // Generate grid paths (5 levels)
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
    const gridPaths = gridLevels.map(level => {
      const points = this.skills.map((_, i) => {
        const x = center + radius * level * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * level * Math.sin(i * angleStep - Math.PI / 2);
        return `${x},${y}`;
      });
      return points.join(' ') + ' ' + points[0];
    });

    // Generate axes
    const axes = this.skills.map((_, i) => {
      const x2 = center + radius * Math.cos(i * angleStep - Math.PI / 2);
      const y2 = center + radius * Math.sin(i * angleStep - Math.PI / 2);
      return { x1: center, y1: center, x2, y2 };
    });

    // Generate radar path
    const radarPoints = this.skills.map((skill, i) => {
      const r = radius * (skill.value / 100);
      const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
      return { x, y };
    });
    const radarPath = radarPoints.map(p => `${p.x},${p.y}`).join(' ') + ' ' + radarPoints[0].x + ',' + radarPoints[0].y;

    // Generate labels
    const labels = this.skills.map((skill, i) => {
      const labelRadius = radius + 25;
      const x = center + labelRadius * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + labelRadius * Math.sin(i * angleStep - Math.PI / 2);
      return { text: skill.subject, x, y };
    });

    return html`
      <div class="container">
        ${this.title ? html`<div class="title">${this.title}</div>` : nothing}
        <svg viewBox="0 0 ${size} ${size}">
          <!-- Grid Lines -->
          ${gridPaths.map(path => html`
            <polygon class="grid-line" points="${path}" />
          `)}
          
          <!-- Axes -->
          ${axes.map(axis => html`
            <line class="axis" x1="${axis.x1}" y1="${axis.y1}" x2="${axis.x2}" y2="${axis.y2}" />
          `)}
          
          <!-- Data Area -->
          <polygon class="radar-area" points="${radarPath}" />
          
          <!-- Data Points -->
          ${radarPoints.map(p => html`
            <circle class="radar-point" cx="${p.x}" cy="${p.y}" r="4" />
          `)}
          
          <!-- Labels -->
          ${labels.map(l => html`
            <text class="label" x="${l.x}" y="${l.y}" text-anchor="middle" dominant-baseline="middle">${l.text}</text>
          `)}
        </svg>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a2ui-skill-radar": SkillRadar;
  }
}
