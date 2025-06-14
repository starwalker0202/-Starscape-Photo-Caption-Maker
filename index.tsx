/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY!;
const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

const ai = new GoogleGenAI({ apiKey: API_KEY });

const imageUpload = document.getElementById('imageUpload') as HTMLInputElement;
const generateButton = document.getElementById('generateButton') as HTMLButtonElement;
const imagePreview = document.getElementById('imagePreview') as HTMLImageElement;
const imagePreviewContainer = document.getElementById('imagePreviewContainer') as HTMLDivElement;
const spinner = document.getElementById('spinner') as HTMLDivElement;
const captionOutput = document.getElementById('captionOutput') as HTMLDivElement;
const captionOutputSection = document.getElementById('captionOutputSection') as HTMLDivElement;
const errorOutput = document.getElementById('errorOutput') as HTMLDivElement;
const copyButton = document.getElementById('copyButton') as HTMLButtonElement;
const copyFeedback = document.getElementById('copyFeedback') as HTMLParagraphElement;


let selectedFile: File | null = null;
let base64Image: string | null = null;
let mimeType: string | null = null;

imageUpload.addEventListener('change', (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files[0]) {
        selectedFile = files[0];
        mimeType = selectedFile.type;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target?.result as string;
            imagePreviewContainer.style.display = 'block';
            base64Image = (e.target?.result as string).split(',')[1]; // Remove "data:mime/type;base64," prefix
            generateButton.disabled = false;
            captionOutputSection.style.display = 'none';
            captionOutput.textContent = '';
            errorOutput.textContent = '';
            copyFeedback.textContent = '';
        }
        reader.readAsDataURL(selectedFile);
    } else {
        selectedFile = null;
        base64Image = null;
        mimeType = null;
        imagePreview.src = '#';
        imagePreviewContainer.style.display = 'none';
        generateButton.disabled = true;
    }
});

generateButton.addEventListener('click', async () => {
    if (!selectedFile || !base64Image || !mimeType) {
        errorOutput.textContent = 'まず画像を選択してください。';
        return;
    }

    spinner.style.display = 'flex';
    captionOutputSection.style.display = 'none';
    captionOutput.textContent = '';
    errorOutput.textContent = '';
    generateButton.disabled = true;
    copyFeedback.textContent = '';

    try {
        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Image,
            },
        };

        const textPart = {
            text: `
あなたはプロの写真キャプションジェネレーターです。アップロードされた星空の画像に最適なSNS投稿用キャプションを生成してください。

以下の出力ルールを厳守してください:
1. 1行の日本語キャプションで、最大全角80文字以内、改行は含めないでください。
2. キャプションの後に続けて、写真の情景を表すフレーズを10〜25文字で記述してください。
3. 最後に半角スペースで区切ってハッシュタグを正確に3個付けてください。
   - 1個目のハッシュタグは必ず「#星空」にしてください。
   - 残り2個のハッシュタグは、写真の特徴から最も適切なものを日本語または英語で自動生成してください (例: #天の川, #milkyway, #流れ星, #shootingstar, #長時間露光)。
   - 全てのハッシュタグは半角の「#」で始めてください。全角記号は使用しないでください。
4. 例示以外の追加説明、絵文字、余計な改行は一切入れないでください。

例:
霧のかかる高原と夏の天の川 #星空 #天の川 #高原
海から昇るオリオン座 #星空 #オリオン座 #星景写真
満月と都市の夜景 #星空 #満月 #都市夜景

提供された画像に基づいて、上記のルールに従ったキャプションとハッシュタグのみを出力してください。
`
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts: [imagePart, textPart] },
        });

        const generatedText = response.text;
        if (generatedText) {
            captionOutput.textContent = generatedText;
            captionOutputSection.style.display = 'block';
        } else {
            errorOutput.textContent = 'キャプションを生成できませんでした。AIからの応答が空です。';
        }

    } catch (e: any) {
        console.error(e);
        errorOutput.textContent = `エラーが発生しました: ${e.message || '不明なエラー'}`;
    } finally {
        spinner.style.display = 'none';
        generateButton.disabled = false;
         if (captionOutput.textContent) {
            copyButton.style.display = 'inline-block';
        } else {
            copyButton.style.display = 'none';
        }
    }
});

copyButton.addEventListener('click', () => {
    if (captionOutput.textContent) {
        navigator.clipboard.writeText(captionOutput.textContent)
            .then(() => {
                copyFeedback.textContent = 'コピーしました！';
                setTimeout(() => {
                    copyFeedback.textContent = '';
                }, 2000);
            })
            .catch(err => {
                copyFeedback.textContent = 'コピーに失敗しました。';
                console.error('Failed to copy text: ', err);
            });
    }
});

// Add keyboard accessibility to the custom file upload button
const uploadButtonLabel = document.querySelector('.upload-button') as HTMLLabelElement;
if (uploadButtonLabel) {
    uploadButtonLabel.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            imageUpload.click();
        }
    });
}
