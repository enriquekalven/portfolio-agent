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

/**
 * A2UI QuizCard Component
 *
 * An interactive multiple-choice quiz card with immediate feedback.
 * This is a custom component for the personalized learning demo.
 */

import { html, css, nothing, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import type { StringValue } from "./types";

interface QuizOption {
  label: StringValue;
  value: string;
  isCorrect: boolean;
}

@customElement("a2ui-quizcard")
export class QuizCard extends LitElement {
  @property({ attribute: false })
  question: StringValue | null = null;

  @property({ attribute: false })
  options: QuizOption[] = [];

  @property({ attribute: false })
  explanation: StringValue | null = null;

  @property({ attribute: false })
  category: StringValue | null = null;

  @state()
  private selectedValue: string | null = null;

  @state()
  private submitted = false;

  static styles = css`
    * {
      box-sizing: border-box;
    }

    :host {
      display: block;
      width: 100%;
      max-width: 500px;
      min-width: 300px;
      margin-bottom: 16px;
    }

    .quiz-card {
      background: rgba(30, 31, 32, 0.4);
      border-radius: 20px;
      padding: 24px;
      color: white;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(10px);
    }

    .category {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.6;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--accent-blue);
    }

    .category::before {
      content: "";
      width: 6px;
      height: 6px;
      background: currentColor;
      border-radius: 50%;
      box-shadow: 0 0 8px currentColor;
    }

    .question {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.5;
      margin-bottom: 24px;
      letter-spacing: -0.2px;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .option:hover:not(.disabled) {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateX(4px);
    }

    .option.selected {
      border-color: var(--accent-blue);
      background: rgba(138, 180, 248, 0.1);
    }

    .option.disabled {
      cursor: default;
    }

    .option.correct {
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.15);
    }

    .option.incorrect {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
    }

    .option.correct-answer {
      border-color: #22c55e;
    }

    .option-marker {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .option.selected .option-marker {
      border-color: var(--accent-blue);
      background: var(--accent-blue);
      color: #1e1f20;
    }

    .option.correct .option-marker {
      border-color: #22c55e;
      background: #22c55e;
      color: white;
    }

    .option.incorrect .option-marker {
      border-color: #ef4444;
      background: #ef4444;
      color: white;
    }

    .option-label {
      font-size: 15px;
      line-height: 1.4;
      font-weight: 500;
    }

    .submit-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 12px;
      background: var(--gemini-gradient);
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(0.5);
    }

    .explanation {
      margin-top: 16px;
      padding: 16px;
      border-radius: 10px;
      background: rgba(34, 197, 94, 0.15);
      border-left: 4px solid #22c55e;
    }

    .explanation.incorrect {
      background: rgba(239, 68, 68, 0.15);
      border-left-color: #ef4444;
    }

    .explanation-header {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .explanation-header .icon {
      font-size: 16px;
    }

    .explanation-text {
      font-size: 13px;
      line-height: 1.5;
      opacity: 0.9;
    }

    .result-icon {
      font-size: 14px;
    }
  `;

  private resolveStringValue(value: StringValue | null): string {
    if (!value) return "";
    if (typeof value === "string") return value;

    if (typeof value === "object") {
      if ("literalString" in value && value.literalString !== undefined && value.literalString !== null) {
        return value.literalString as string;
      } else if ("literal" in value && value.literal !== undefined && value.literal !== null) {
        return String(value.literal);
      }
    }

    return "";
  }

  private handleOptionClick(value: string) {
    if (this.submitted) return;
    this.selectedValue = value;
  }

  private handleSubmit() {
    if (!this.selectedValue) return;
    this.submitted = true;
  }

  private isCorrectAnswer(): boolean {
    if (!this.selectedValue) return false;
    const selected = this.options.find(o => o.value === this.selectedValue);
    return selected?.isCorrect ?? false;
  }

  render() {
    const questionText = this.resolveStringValue(this.question);
    const categoryText = this.resolveStringValue(this.category);
    const explanationText = this.resolveStringValue(this.explanation);
    const isCorrect = this.isCorrectAnswer();

    return html`
      <div class="quiz-card">
        ${categoryText
          ? html`<div class="category">${categoryText}</div>`
          : nothing}

        <div class="question">${questionText}</div>

        <div class="options">
          ${this.options.map((option, index) => {
            const label = this.resolveStringValue(option.label);
            const isSelected = this.selectedValue === option.value;
            const showCorrect = this.submitted && option.isCorrect;
            const showIncorrect = this.submitted && isSelected && !option.isCorrect;

            return html`
              <div
                class=${classMap({
                  option: true,
                  selected: isSelected && !this.submitted,
                  disabled: this.submitted,
                  correct: showCorrect && isSelected,
                  incorrect: showIncorrect,
                  "correct-answer": showCorrect && !isSelected,
                })}
                @click=${() => this.handleOptionClick(option.value)}
              >
                <div class="option-marker">
                  ${this.submitted
                    ? option.isCorrect
                      ? html`<span class="result-icon">✓</span>`
                      : isSelected
                        ? html`<span class="result-icon">✗</span>`
                        : String.fromCharCode(65 + index)
                    : String.fromCharCode(65 + index)}
                </div>
                <div class="option-label">${label}</div>
              </div>
            `;
          })}
        </div>

        ${!this.submitted
          ? html`
              <button
                class="submit-btn"
                ?disabled=${!this.selectedValue}
                @click=${this.handleSubmit}
              >
                Check Answer
              </button>
            `
          : html`
              <div class=${classMap({ explanation: true, incorrect: !isCorrect })}>
                <div class="explanation-header">
                  <span class="icon">${isCorrect ? "✓" : "✗"}</span>
                  ${isCorrect ? "Correct!" : "Not quite..."}
                </div>
                <div class="explanation-text">${explanationText}</div>
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a2ui-quizcard": QuizCard;
  }
}
