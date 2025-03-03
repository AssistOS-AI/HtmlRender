export class RoutingService {
    constructor() {}
    async navigateToLocation(locationArray = [], appName) {
        const HTML_RENDER = "html-render";

       if (locationArray.length === 0 || locationArray[0] === HTML_RENDER) {
            const pageUrl = `${assistOS.space.id}/${appName}/${HTML_RENDER}`;
            await assistOS.UI.changeToDynamicPage(HTML_RENDER, pageUrl);
            return;
        }
         if(locationArray[locationArray.length-1]!== HTML_RENDER){
         console.error(`Invalid URL: URL must end with ${HTML_RENDER}`);
            return;
        }
        const webComponentName = locationArray[locationArray.length - 1];
        const pageUrl = `${assistOS.space.id}/${appName}/${locationArray.join("/")}`;
        await assistOS.UI.changeToDynamicPage(webComponentName, pageUrl);
    }
}
