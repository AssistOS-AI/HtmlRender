const spaceModule = require("assistos").loadModule("space", {});
const llmModule = require("assistos").loadModule("llm", {});
const documentModule = require("assistos").loadModule("document", {});
import pluginUtils from "../../../../../../wallet/core/plugins/pluginUtils.js";

function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve(url);
            return;
        }
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => resolve(url);
        script.onerror = () => reject(new Error(`Eroare la incărcarea scriptului: ${url}`));
        document.head.appendChild(script);
    });
}

function loadCSS(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`link[href="${url}"]`)) {
            resolve(url);
            return;
        }
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.onload = () => resolve(url);
        link.onerror = () => reject(new Error(`Eroare la incarcarea CSS: ${url}`));
        document.head.appendChild(link);
    });
}

export class HtmlRender {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.editor = null;
        this.isUpdatingFromEditor = false;
        this.isUpdatingFromTextArea = false;
        this.syncTextareaListener = null;

        let documentPage = document.querySelector("document-view-page");
        if (!documentPage) {
            if(typeof showApplicationError === 'function') {
                return showApplicationError("Application page not done yet", "Use this as a plugin in paragraph");
            } else {
                console.error("Application page not found and showApplicationError is not defined.");
                return;
            }
        }
        let documentPresenter = documentPage.webSkelPresenter;
        if (!documentPresenter || !documentPresenter.element) {
            console.error("Document presenter or its element not found");
            return;
        }
        let context = pluginUtils.getContext(this.element);
        if (!context || !context.paragraphId) {
            console.error("Plugin context or paragraphId not found for element:", element);
            return;
        }
        this.paragraphId = context.paragraphId;
        const paragraphElement = documentPresenter.element.querySelector(
            `paragraph-item[data-paragraph-id="${this.paragraphId}"]`
        );
        if (!paragraphElement) {
            console.error(`Paragraph element with id ${this.paragraphId} not found`);
            return;
        }
        this.paragraphPresenter = paragraphElement.webSkelPresenter;
        if (!this.paragraphPresenter) {
            console.error(`Presenter for paragraph ${this.paragraphId} not found`);
            return;
        }
        this.commandsEditor = this.paragraphPresenter.commandsEditor;
        this.element.classList.add("maintain-focus");
        this.invalidate();
    }

    beforeRender() {}

    async afterRender() {
        try {
            const scriptURL = "//cdn.jsdelivr.net/npm/medium-editor@latest/dist/js/medium-editor.min.js";
            const cssURL = "//cdn.jsdelivr.net/npm/medium-editor@latest/dist/css/medium-editor.min.css";
            await loadCSS(cssURL);
            await loadScript(scriptURL);
            const cssURLTable = "//cdn.jsdelivr.net/npm/medium-editor-tables@latest/dist/css/medium-editor-tables.css";
            const scriptURLTable = "//cdn.jsdelivr.net/npm/medium-editor-tables@latest/dist/js/medium-editor-tables.js";
            await loadCSS(cssURLTable);
            await loadScript(scriptURLTable);
        } catch (error) {
            console.error("Librăria Medium Editor nu a putut fi încărcată:", error);
            return;
        }

        await this.displayImage();

        // ** Logic to wrap initial content moved here **
        if (!this.editor && this.paragraphPresenter?.element) { // Check if editor not already initialized from a previous render cycle
            const textAreaElement = this.paragraphPresenter.element.querySelector(".paragraph-text");
            const editorContainer = this.element.querySelector(".html-code");

            if (textAreaElement && editorContainer) {
                let initialContent = textAreaElement.value || "";
                let formattedContent = initialContent;
                const trimmedContent = initialContent.trim();
                const startsWithBlockTag = /^\s*<(p|h[1-6]|div|ul|ol|li|blockquote|pre|table|figure)/i.test(trimmedContent);

                if (!trimmedContent) {
                    formattedContent = "<p><br></p>";
                } else if (!startsWithBlockTag) {
                    formattedContent = '<p>' + initialContent + '</p>';
                }

                // Update both container and textarea BEFORE highlight
                if (editorContainer.innerHTML !== formattedContent) {
                    editorContainer.innerHTML = formattedContent;
                }
                if (textAreaElement.value !== formattedContent) {
                    textAreaElement.value = formattedContent;
                }
            }
        }

        if (this.paragraphPresenter) {
            await this.paragraphPresenter.highlightParagraph(); // This will trigger reactToHighlight
        }
    }

    async insertImage() {
        if (!this.commandsEditor) return;
        await this.commandsEditor.insertAttachmentCommand("image");
        this.invalidate();
        setTimeout(async () => await this.displayImage(), 0);
    }

    async deleteImage() {
        if (!this.commandsEditor) return;
        await this.commandsEditor.deleteCommand("image");
        this.invalidate();
        setTimeout(async () => await this.displayImage(), 0);
    }

    setupLivePreview() {
        if (!this.paragraphPresenter?.element) return;
        const textAreaElement = this.paragraphPresenter.element.querySelector(".paragraph-text");
        const previewContainer = this.element.querySelector(".html-code");
        if (textAreaElement && previewContainer) {
            const unsanitizeFn = window.assistOS?.UI?.unsanitize || ((html) => html);
            textAreaElement.addEventListener("input", () => {
                if (this.editor) return;
                const paragraphText = textAreaElement.value;
                const cleaned = unsanitizeFn(paragraphText);
                previewContainer.innerHTML = cleaned;
            });
        } else {
            console.warn("Nu s-au găsit elementele necesare pentru live preview.");
        }
    }

    async reactToHighlight() {
        if (!this.paragraphPresenter?.element) return;
        const textAreaElement = this.paragraphPresenter.element.querySelector(".paragraph-text");
        const editorContainer = this.element.querySelector(".html-code");

        if (!editorContainer) {
            console.warn("Elementul .html-code nu a fost găsit.");
            return;
        }

        if (typeof MediumEditor === 'undefined' || typeof MediumEditorTable === 'undefined') {
            console.error('MediumEditor or MediumEditorTable is not defined. Ensure scripts loaded correctly.');
            editorContainer.innerHTML = "Editor failed to initialize.";
            return;
        }

        if (!this.editor) {
            this.editor = new MediumEditor(editorContainer, {
                disableEditing: false,
                placeholder: { text: "", hideOnClick: true },
                toolbar: {
                    buttons: [
                        'bold',
                        'italic',
                        'underline',
                        'orderedlist',
                        'unorderedlist',
                        'table'
                    ]
                },
                extensions: {
                    table: new MediumEditorTable({
                        rows: 10,
                        columns: 10,
                        buttonContent: 'TBL'
                    })
                }
            });

            this.editor.subscribe('editableInput', () => {
                if (this.isUpdatingFromTextArea) return;
                this.isUpdatingFromEditor = true;
                const currentEditorHtml = this.editor.getContent();
                if (textAreaElement && textAreaElement.value !== currentEditorHtml) {
                    console.log(assistOS.UI.unsanitize(currentEditorHtml));
                    textAreaElement.value = assistOS.UI.unsanitize(currentEditorHtml);
                }
                setTimeout(() => { this.isUpdatingFromEditor = false; }, 0);
            });

            if (textAreaElement) {
                if (this.syncTextareaListener) {
                    textAreaElement.removeEventListener('input', this.syncTextareaListener);
                }
                this.syncTextareaListener = () => {
                    if (this.isUpdatingFromEditor) return;
                    if (!this.editor) return;
                    this.isUpdatingFromTextArea = true;
                    const newHtml = assistOS.UI.unsanitize(textAreaElement.value);
                    if (this.editor.getContent() !== newHtml) {
                        this.editor.setContent(newHtml);
                    }
                    setTimeout(() => { this.isUpdatingFromTextArea = false; }, 0);
                };
                textAreaElement.addEventListener('input', this.syncTextareaListener);
            }
        } else {

            if (textAreaElement) {
                const currentTextareaContent = assistOS.UI.unsanitize(textAreaElement.value);
                if (this.editor.getContent() !== currentTextareaContent) {
                    this.editor.setContent(currentTextareaContent);
                }
            }
        }

        this.setupLivePreview();

        if (this.editor) {
            const firstChild = editorContainer.firstChild;
            if (firstChild) {
                this.editor.selectElement(firstChild);
                const range = MediumEditor.selection.getSelectionRange(document);
                range.collapse(false);
                MediumEditor.selection.selectRange(document, range);
            } else {
                this.editor.selectElement(editorContainer);
            }
            setTimeout(() => {
                if (this.editor) this.editor.focus();
            }, 50);
        }
    }


    async removeReactionToHighlight() {
        if (!this.paragraphPresenter?.element) return;
        const textAreaElement = this.paragraphPresenter.element.querySelector(".paragraph-text");

        let finalHtmlContent = "";
        if (this.editor) {
            try {
                finalHtmlContent = this.editor.getContent();
            } catch (e) {
                console.error("Could not get content from editor instance", e);
                if (textAreaElement) {
                    finalHtmlContent = textAreaElement.value;
                }
            }
        } else if (textAreaElement) {
            finalHtmlContent = textAreaElement.value;
        }

        if (textAreaElement && textAreaElement.value !== finalHtmlContent) {
            textAreaElement.value = finalHtmlContent;
        }

        const spaceId = assistOS.space?.id;
        const documentId = this.paragraphPresenter?._document?.id;
        const paragraphId = this.paragraphPresenter?.paragraph?.id;
        if (spaceId && documentId && paragraphId) {
            try {
                await documentModule.updateParagraphText(
                    spaceId,
                    documentId,
                    paragraphId,
                    finalHtmlContent
                );
            } catch (error) {
                console.error("Error saving paragraph HTML:", error);
            }
        } else {
            console.warn("Missing data required to save paragraph HTML (spaceId, documentId, paragraphId).");
        }
    }

    async displayImage() {
        let imageElement = this.element.querySelector(".paragraph-image");
        if (!imageElement) return;

        if (!this.paragraphPresenter?.paragraph?.commands?.image) {
            imageElement.classList.add("hidden");
            return;
        }
        imageElement.classList.remove("hidden");
        try {
            if (this.paragraphPresenter.paragraph.commands.image.id) {
                imageElement.src = await spaceModule.getImageURL(this.paragraphPresenter.paragraph.commands.image.id);
            } else {
                console.warn("Image command exists but has no ID.");
                imageElement.classList.add("hidden");
            }
        } catch (e) {
            console.error("Failed to load image URL", e);
            imageElement.classList.add("hidden");
        }
    }
}