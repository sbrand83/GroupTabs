function Group(name, tabs) {
    this.name = name;
    this.tabs = tabs;

    this.getName = function() {return this.name;};
    this.getTabs = function() {return this.tabs;};
}