module.exports = class uiElement {
  #defaultClassList;
  #defaultTextContent;
  #defaultInnerHTML;
  #isDisabled;

  constructor(elementti) {
    this.element = elementti;
    this.#defaultClassList = elementti.classList.value;
    this.#defaultInnerHTML = elementti.innerHTML;
    this.#isDisabled = elementti.disabled;
    elementti.textContent !== undefined ? this.#defaultTextContent = elementti.textContent : this.#defaultTextContent = null;
  }

  // Set & Get UI Element value
  set value(value) {
    this.element.value = value;
  }
  get value() {
    return this.element.value;
  }

  // Set & Get UI Element InnerHTML
  set innerHTML(innerHTML) {
    this.element.innerHTML = innerHTML;
  }
  get innerHTML() {
    return this.element.innerHTML;
  }

  // Set & Get UI Element textContent
  set textContent(textContent) {
    this.element.textContent = textContent;
  }
  get textContent() {
    return this.element.textContent;
  }

  // Dev tools
  getDefaults() {
    console.log(this.#defaultTextContent);
    console.log(this.#defaultInnerHTML);
    console.log(this.#defaultClassList);
    console.log(this.#isDisabled);
  }

  reset() {
    this.element.textContent = this.#defaultTextContent;
    this.element.classList = this.#defaultClassList;
    this.element.innerHTML = this.#defaultInnerHTML;
    this.element.disabled = this.#isDisabled;
  }
}

