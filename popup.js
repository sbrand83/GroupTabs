// Get all active tabs in the window
var groups = [];

var createGroupButton = document.getElementById("create-group-button");
createGroupButton.addEventListener("click", createGroupClickHandler);

var newGroupNameInput = document.getElementById("create-group-name-input");

console.log("got here!!!");

function createGroupClickHandler() { 
    chrome.tabs.query({}, createGroup);
}

function createGroup(tabs) {
    var name = newGroupNameInput.value;
    newGroupNameInput.value = "";
    var newGroup = new Group(name, tabs);
    groups.push(newGroup);
    updateGroupsList();
}

function updateGroupsList() {
    var groups_list = document.getElementById("groups-list");
    // clear the list
    while (groups_list.firstChild) {
        groups_list.removeChild(groups_list.firstChild);
    }
    
    for (var i = 0; i < groups.length; i++) {
        addGroupToList(groups[i]);
    }
}

function addGroupToList(group) {
    var groups_list = document.getElementById("groups-list");
    var group_button = document.createElement("button");
    var button_text = document.createTextNode(group.getName());
    group_button.appendChild(button_text);
    
    group_button.addEventListener("click", openGroup);


    groups_list.appendChild(group_button);
    console.log("creating new group");
}

function openGroup(event) {
    console.log("opening group");
    var groupName = event.srcElement.textContent;
    var selectedGroup;

    for (var i = 0; i < groups.length; i++) {
        if (groups[i].getName() === groupName) {
            selectedGroup = groups[i];
            break;
        }
    }

    if (!selectedGroup) {
        return;
    }

    var urls = [];
    var tabs = selectedGroup.getTabs();
    for (i = 0; i < tabs.length; i++) {
        urls.push(tabs[i].url);
    }

    chrome.windows.create({url: urls});
}