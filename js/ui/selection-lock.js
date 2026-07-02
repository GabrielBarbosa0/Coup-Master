(function () {
    function isEditableElement(element) {
        if (!element || element === document || element === window) {
            return false;
        }

        const targetElement = element.nodeType === Node.ELEMENT_NODE ? element : element.parentElement;

        if (!targetElement) {
            return false;
        }

        const editable = targetElement.closest('input, textarea, [contenteditable="true"], [data-allow-select="true"]');
        return Boolean(editable);
    }

    document.addEventListener('selectstart', function (event) {
        if (!isEditableElement(event.target)) {
            event.preventDefault();
        }
    }, true);

    document.addEventListener('selectionchange', function () {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || isEditableElement(document.activeElement)) {
            return;
        }

        const anchorNode = selection.anchorNode;
        const anchorElement = anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE
            ? anchorNode
            : anchorNode && anchorNode.parentElement;

        if (!isEditableElement(anchorElement)) {
            selection.removeAllRanges();
        }
    });
}());
