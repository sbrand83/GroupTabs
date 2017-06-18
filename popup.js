var local_groups = [];

var createGroupButton = document.getElementById("create-group-button");
createGroupButton.addEventListener("click", createGroupClickHandler);

var newGroupNameInput = document.getElementById("create-group-name-input");

var createGroupSelect = document.getElementById("create-group-method-select");
createGroupSelect.addEventListener("change", switchCreateGroupMethod);

initializeGroupsList();

function initializeGroupsList() {
    chrome.storage.sync.get("groups", function(items) {
        var groups = items.groups;
        deserializeGroups(groups);
        updateGroupsList();
    });
}

function createGroupClickHandler() { 
    chrome.tabs.query({}, createGroup);
}

function createGroup(tabs) {
    var name = newGroupNameInput.value;
    newGroupNameInput.value = "";

    var tab_urls = [];
    for (var i = 0; i < tabs.length; i++) {
        tab_urls.push(tabs[i].url);
    }
    var newGroup = new Group(name, tab_urls);
    local_groups.push(newGroup);

    chrome.storage.sync.get('groups', function(items) {
        var serialized_groups = items.groups;
        if (serialized_groups) {
            for (var i = 0; i < serialized_groups.length; i++) {
                if (serialized_groups[i].name === newGroup.getName()) {
                    serialized_groups[i] = newGroup.serialize();
                    chrome.storage.sync.set({"groups": serialized_groups});
                    return;
                }
            }
        } else {
            serialized_groups = [];
        }
        
        serialized_groups.push(newGroup.serialize());
        chrome.storage.sync.set({"groups": serialized_groups});
        deserializeGroups(serialized_groups);
        updateGroupsList();
    });
}

function deserializeGroups(serializedGroups) {
    local_groups = [];
    for (var i = 0; i < serializedGroups.length; i++) {
        local_groups.push(new Group(serializedGroups[i].name, serializedGroups[i].tab_urls));
    }
}

function updateGroupsList() {
    var groups_list = document.getElementById("groups-list");
    // clear the list
    while (groups_list.firstChild) {
        groups_list.removeChild(groups_list.firstChild);
    }

    if (local_groups.length === 0) {
        var noGroupsText = document.createElement("p");
        var p_text = document.createTextNode("You don't have any groups yet. Add one below.");
        noGroupsText.appendChild(p_text);
        groups_list.appendChild(noGroupsText);
    } else {
        for (var i = 0; i < local_groups.length; i++) {
            addGroupToList(local_groups[i]);
        }
    }
}

function addGroupToList(group) {
    var groupRow = document.createElement("div");
    groupRow.classList.add("group-row");

    var groupsList = document.getElementById("groups-list");
    var groupName = document.createElement("h3");
    var groupNameText = document.createTextNode(group.getName());
    groupName.appendChild(groupNameText);
    groupName.classList += "group-name";

    var openGroupButton = document.createElement("button");
    var openGroupButtonText = document.createTextNode("Open");
    openGroupButton.appendChild(openGroupButtonText);
    openGroupButton.value = group.getName();
    openGroupButton.classList += "open-group-button";
    openGroupButton.addEventListener("click", openGroup);

    var removeGroupButton = document.createElement("button");
    var removeGroupButtonText = document.createTextNode("Remove");
    removeGroupButton.appendChild(removeGroupButtonText);
    removeGroupButton.value = group.getName();
    removeGroupButton.classList += "remove-group-button";
    removeGroupButton.addEventListener("click", removeGroup);

    var clearFloat = document.createElement("div");
    clearFloat.classList += "clear-float";

    groupRow.appendChild(groupName);
    groupRow.appendChild(removeGroupButton);
    groupRow.appendChild(openGroupButton);
    groupRow.appendChild(clearFloat);

    groupsList.appendChild(groupRow);
}

function openGroup(event) {
    var groupName = event.srcElement.value;
    var selectedGroup;

    for (var i = 0; i < local_groups.length; i++) {
        if (local_groups[i].getName() === groupName) {
            selectedGroup = local_groups[i];
            break;
        }
    }

    if (!selectedGroup) {
        return;
    }

    var tab_urls = selectedGroup.getTabUrls();
    chrome.windows.create({url: tab_urls});
}

function removeGroup(event) {
    var groupName = event.srcElement.value;

    chrome.storage.sync.get('groups', function(items) {
        var serialized_groups = items.groups;
        if (serialized_groups) {
            for (var i = 0; i < serialized_groups.length; i++) {
                if (serialized_groups[i].name === groupName) {
                    //remove the group if it is there
                    serialized_groups.splice(i, 1);
                    chrome.storage.sync.set({"groups": serialized_groups});
                }
            }
        } else {
            serialized_groups = [];
        }

        deserializeGroups(serialized_groups);
        updateGroupsList();
    });
}

function switchCreateGroupMethod(event) {
    var options = event.srcElement.options;
    var selected = options[options.selectedIndex].value;

    var groupUrls = document.getElementById("create-group-urls");
    var createGroupInfo = document.getElementById("create-group-info");

    switch (selected) {
        case 'current-window':
            while (groupUrls.firstChild) {
                groupUrls.removeChild(groupUrls.firstChild);
            }
            createGroupInfo.textContent = "Group will be made up of all active tabs in the current window.";
            break;
        case 'manual':
            var urlInput = document.createElement("input");
            urlInput.type = "url";
            urlInput.placeholder = "https://www.google.com";

            groupUrls.appendChild(urlInput);

            createGroupInfo.textContent = "Group will be made up of all URLs entered below.";
            break;
        default:
    }
}