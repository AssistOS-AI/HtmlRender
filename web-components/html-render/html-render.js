const spaceModule = require("assistos").loadModule("space", {});
const llmModule = require('assistos').loadModule('llm',{})
const documentModule = require('assistos').loadModule('document',{})
import pluginUtils from "../../../../../../wallet/core/plugins/pluginUtils.js";

export class HtmlRender {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        let documentPage = document.querySelector("document-view-page");
        if(!documentPage){
            return showApplicationError("Application page not done yet", "Use this as a plugin in paragraph");
        }
        let documentPresenter = documentPage.webSkelPresenter;
        let context = pluginUtils.getContext(this.element);
        this.paragraphId = context.paragraphId;
        this.paragraphPresenter = documentPresenter.element.querySelector(`paragraph-item[data-paragraph-id="${this.paragraphId}"]`).webSkelPresenter;
        this.commandsEditor = this.paragraphPresenter.commandsEditor;
        this.element.classList.add("maintain-focus");
        this.invalidate();
    }
    beforeRender(){

    }
    async afterRender(){
        let imageElement = this.element.querySelector(".paragraph-image");

        if(this.paragraphPresenter.paragraph.commands.image){
            imageElement.classList.remove("hidden");
            imageElement.src = await spaceModule.getImageURL(this.paragraphPresenter.paragraph.commands.image.id);
        }

        const paragraphText = await documentModule.getParagraphText(assistOS.space.id,this.paragraphPresenter._document.id,this.paragraphPresenter.paragraph.id);

        // console.log(paragraphText);
        const paragraphTextCleaned = assistOS.UI.unsanitize(paragraphText);
        // console.log(paragraphTextCleaned);

        if(await this.containsValidHTML(paragraphTextCleaned) === true){
            console.log("OK");
            let htmlParagraph = this.element.querySelector(".html-code");
            htmlParagraph.insertAdjacentHTML("afterbegin", paragraphTextCleaned);
        }
        else{
           console.log("Invalid Code");
        }




    }
    async insertImage(){
        await this.commandsEditor.insertAttachmentCommand("image");
        this.invalidate();
    }
    async deleteImage() {
        await this.commandsEditor.deleteCommand("image");
        this.invalidate();
    }

    async containsValidHTML(text) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");

        if (doc.querySelector("parsererror")) {
            return false;
        }

        const styleElements = doc.querySelectorAll("style");
        for (const styleEl of styleElements) {
            const cssText = styleEl.textContent;
            if (!this.areCurlyBracesBalanced(cssText)) {
                return false;
            }
        }

        const tagStack = [];
        const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
        let match;
        const selfClosingTags = new Set([
            "area", "base", "br", "col", "embed", "hr", "img", "input",
            "keygen", "link", "meta", "param", "source", "track", "wbr"
        ]);

        while ((match = tagRegex.exec(text)) !== null) {
            const tagName = match[1].toLowerCase();

            if (!match[0].startsWith("</")) {
                if (!selfClosingTags.has(tagName)) {
                    tagStack.push(tagName);
                }
            } else {
                if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
                    return false;
                }
                tagStack.pop();
            }
        }

        return tagStack.length === 0;
    }

    areCurlyBracesBalanced(cssText) {
        let balance = 0;
        for (let char of cssText) {
            if (char === '{') balance++;
            else if (char === '}') balance--;
            if (balance < 0) return false;
        }
        return balance === 0;
    }
}
