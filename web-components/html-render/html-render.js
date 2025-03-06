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

    }
    async insertImage(){
        await this.commandsEditor.insertAttachmentCommand("image");
        this.invalidate();
    }
    async deleteImage() {
        await this.commandsEditor.deleteCommand("image");
        this.invalidate();
    }

    async renderTheHTML(){
        const text = document.getElementById("codeInput").value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        if (doc.querySelector("parsererror")) {
            console.log("Cod prost");
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
                    console.log("Cod prost");
                }
                tagStack.pop();
            }
        }

        if(tagStack.length === 0){

            console.log("Cod bun");
            this.paragraphPresenter.paragraph.text = "Te pup pa pa";

            let textElement = this.paragraphPresenter.element.querySelector(".paragraph-text");

            let pureText = doc.body.textContent;
            textElement.innerText = pureText;

            await documentModule.updateParagraphText(assistOS.space.id, this.paragraphPresenter._document.id,  this.paragraphPresenter.paragraph.id, pureText);

        }
        else{
            console.log("Cod prost");
        }

    }

}
