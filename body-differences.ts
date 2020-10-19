/*
[
    {
        steps: [0, 0, 1], -> Steps from the body element to get the matching element that needs to be updated in the old document to reflect the new changes
                             <body>
                                 <div> -> 0
                                     <div> -> 0
                                         <p>Hello</p>
                                         <p>world</p> -> 1
                                     </div>
                                  </div>
                              </body>
        newContent: "<p>test</p>" -> New outerHTML content
    }
]
*/
function getBodyDifferences(oldDom: Document, newDom: Document): { steps: number[], newContent: string }[] {
    function uniquifyElement(element: Element): string {
        let hash: string = element.tagName;
        let tempElement: Element = element;

        while (tempElement.parentElement) {
            if (tempElement.tagName === "BODY") break;
            hash += tempElement.className
                + Object.values(tempElement.attributes).filter(a => !a.startsWith("data-")).join("");
            tempElement = tempElement.parentElement;
        }

        return hash;
    }

    function getStepsFromBodyDownwards(element: Element): number[] {
        const steps: number[] = [];
        let currentElement: Element = element;

        while (currentElement.parentElement) {
            if (currentElement.tagName === "BODY") break;
            steps.push(Array.from(currentElement.parentElement!.children).indexOf(currentElement));
            currentElement = currentElement.parentElement;
        }

        return steps.reverse();
    }

    function isSameNode(element1: Element, element2: Element) {
        return element1.outerHTML === element2.outerHTML;
    }

    const newElements: Element[] = Array.from(newDom.querySelectorAll("body *")) as Element[];

    let notAlreadyExistingElements: Element[] = [];
    for (const newElement of newElements) {
        let isInDocument = false;
        for (const oldElement of (Array.from(oldDom.querySelectorAll(`body ${newElement.tagName}`)) as Element[])) {
            if (isSameNode(newElement, oldElement)) {
                isInDocument = true;
                break;
            }
        }

        if (isInDocument) continue;
        notAlreadyExistingElements.push(newElement);
    }

    for (const notAlreadyExistingElement of notAlreadyExistingElements) {
        let currentElement = notAlreadyExistingElement;

        while (currentElement.parentElement) {
            currentElement = currentElement.parentElement;
            if (currentElement.tagName === "BODY") break;

            for (const notAlreadyExistingOtherElement of Array.from(newDom.querySelectorAll(`body ${currentElement.tagName}`))) {
                if (uniquifyElement(currentElement) === uniquifyElement(notAlreadyExistingOtherElement as Element)) {
                    notAlreadyExistingElements = notAlreadyExistingElements.filter((element) => element !== notAlreadyExistingOtherElement);
                }
            }
        }
    }

    const transferInformation = [];
    for (const notAlreadyExistingElement of notAlreadyExistingElements) {
        let matchingElementInOldDocument: Element = oldDom.querySelector("body") as Element;
        let currentElement = notAlreadyExistingElement;

        while (currentElement) {
            if (currentElement.tagName === "BODY") break;
            const possibleMatchingElementInOldDocument = (Array.from(oldDom.querySelectorAll(`body ${currentElement.tagName}`)) as Element[])
                .find(oldElement => uniquifyElement(oldElement) === uniquifyElement(currentElement));

            if (possibleMatchingElementInOldDocument) {
                matchingElementInOldDocument = possibleMatchingElementInOldDocument;
                break;
            }

            if (!currentElement.parentElement) break;
            currentElement = currentElement.parentElement;
        }

        const steps = getStepsFromBodyDownwards(matchingElementInOldDocument);
        const jsonSteps = JSON.stringify(steps);

        let elementIsAlreadyGettingUpdated = false;
        for (const singleTransferInformation of transferInformation) {
            if (JSON.stringify(singleTransferInformation.steps) === jsonSteps) {
                elementIsAlreadyGettingUpdated = true;
                break;
            }
        }

        if (elementIsAlreadyGettingUpdated) continue;
        transferInformation.push({
            steps: getStepsFromBodyDownwards(matchingElementInOldDocument as Element),
            newContent: this.parseHTMLSnippet(currentElement.outerHTML)
        });
    }

    return transferInformation;
}
