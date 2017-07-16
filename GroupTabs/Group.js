function Group(name, urls) {
    this.name = name;
    this.tab_urls = urls;

    this.getName = function() {return this.name;};
    this.getTabUrls = function() {return this.tab_urls;};

    this.serialize = function() {
        var serialized_group = {};
        serialized_group.name = this.name;
        serialized_group.tab_urls = this.tab_urls;
        return serialized_group;
    };
}