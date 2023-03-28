const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var ListPinnedPage = GObject.registerClass(
class ArcMenu_ListPinnedPage extends Gtk.Box {
    _init(settings, listType, settingString) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this.listType = listType;
        this._settings = settings;

        let addMoreTitle;
        if(this.listType === Constants.MenuSettingsListType.PINNED_APPS){
            this.settingString = 'pinned-app-list';
            this.appsList = this._settings.get_strv('pinned-app-list');
            addMoreTitle = _("Add More Apps");
        }
        else if(this.listType === Constants.MenuSettingsListType.DIRECTORIES){
            this.settingString = 'directory-shortcuts-list';
            this.appsList = [];
            let appsList = this._settings.get_value('directory-shortcuts-list').deep_unpack();
            for(let i = 0; i < appsList.length; i++){
                this.appsList.push(appsList[i][0]);
                this.appsList.push(appsList[i][1]);
                this.appsList.push(appsList[i][2]);
            }
            addMoreTitle = _("Add Default User Directories");
        }
        else if(this.listType === Constants.MenuSettingsListType.APPLICATIONS){
            this.settingString = 'application-shortcuts-list';
            this.appsList = [];
            let appsList = this._settings.get_value('application-shortcuts-list').deep_unpack();
            for(let i = 0; i < appsList.length; i++){
                this.appsList.push(appsList[i][0]);
                this.appsList.push(appsList[i][1]);
                this.appsList.push(appsList[i][2]);
            }
            addMoreTitle = _("Add More Apps");
        }
        else if(this.listType === Constants.MenuSettingsListType.OTHER){
            this.settingString = settingString;
            this.appsList = this._settings.get_strv(settingString);
        }

        this.frameRows = [];
        this.frame = new Adw.PreferencesGroup();

        this._createFrame(this.appsList);
        this.append(this.frame);

        if(this.listType !== Constants.MenuSettingsListType.OTHER){
            let addMoreGroup = new Adw.PreferencesGroup();
            let addMoreButton = new PW.Button({
                icon_name: 'list-add-symbolic',
            });
            addMoreButton.connect('clicked', ()=> {
                let dialog = new AddAppsToPinnedListWindow(this._settings, this, this.listType, this.settingString);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        this._createFrame(dialog.newPinnedAppArray);
                        this.saveSettings();
                    }
                    if(response === Gtk.ResponseType.REJECT) {
                        let command = dialog.newPinnedAppArray[2];
                        let frameRow;
                        this.frameRows.forEach(child => {
                            if(command === child._cmd)
                                frameRow = child;
                        });
                        if(frameRow){
                            this.frameRows.splice(this.frameRows.indexOf(frameRow), 1);
                            this.frame.remove(frameRow);
                            this.saveSettings();
                        }
                    }
                });
            });
            let addMoreRow = new Adw.ActionRow({
                title: _(addMoreTitle),
                activatable_widget: addMoreButton
            });
            addMoreRow.add_suffix(addMoreButton);
            addMoreGroup.add(addMoreRow);
            this.append(addMoreGroup);

            let addCustomButton = new PW.Button({
                icon_name: 'list-add-symbolic',
            });
            addCustomButton.connect('clicked', ()=> {
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, this.listType);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        let newPinnedApps = dialog.newPinnedAppArray;
                        this._createFrame(newPinnedApps);
                        dialog.destroy();
                        this.saveSettings();
                    }
                });
            });
            let addCustomRow = new Adw.ActionRow({
                title: _("Add Custom Shortcut"),
                activatable_widget: addCustomButton
            });
            addCustomRow.add_suffix(addCustomButton);
            addMoreGroup.add(addCustomRow);
        }

        this.restoreDefaults = () => {
            this.frameRows.forEach(child => {
                this.frame.remove(child);
            });

            this.frameRows = [];

            let appsList = this._settings.get_default_value(this.settingString).deep_unpack();
            if(this.listType !== Constants.MenuSettingsListType.PINNED_APPS){
                this.appsList = [];
                for(let i = 0; i < appsList.length; i++){
                    this.appsList.push(appsList[i][0]);
                    this.appsList.push(appsList[i][1]);
                    this.appsList.push(appsList[i][2]);
                }
            }
            else
                this.appsList = appsList;

            this._createFrame(this.appsList);
            this.saveSettings();
        };
    }

    saveSettings(){
        let array = [];
        this.frameRows.sort((a, b) => {
            return a.get_index() > b.get_index();
        })
        this.frameRows.forEach(child => {
            if(this.listType === Constants.MenuSettingsListType.PINNED_APPS || this.listType === Constants.MenuSettingsListType.OTHER){
                array.push(child._name);
                array.push(child._icon);
                array.push(child._cmd);
            }
            else
                array.push([child._name, child._icon, child._cmd]);
        });

        if(this.listType === Constants.MenuSettingsListType.PINNED_APPS || this.listType === Constants.MenuSettingsListType.OTHER)
            this._settings.set_strv(this.settingString, array);
        else
            this._settings.set_value(this.settingString, new GLib.Variant('aas', array));
    }

    _createFrame(array) {
        for(let i = 0; i < array.length; i += 3) {
            let frameRow = new PW.DragRow();
            let editable = true;
            if(array[i + 2].startsWith("ArcMenu_")){
                editable = false;
            }

            let iconString;
            frameRow._name = array[i];
            frameRow._icon = array[i + 1];
            frameRow._cmd = array[i + 2];

            if(frameRow._icon === "ArcMenu_ArcMenuIcon"){
                frameRow._icon = Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg';
            }
            else if(frameRow._cmd === 'ArcMenu_Software'){
                for(let softwareManagerID of Constants.SoftwareManagerIDs){
                    let app = Gio.DesktopAppInfo.new(softwareManagerID);
                    if(app){
                        frameRow._icon = app.get_icon()?.to_string();
                        break;
                    }
                }
            }
            else if(this.listType === Constants.MenuSettingsListType.DIRECTORIES || this.listType === Constants.MenuSettingsListType.OTHER){
                frameRow._icon = Utils.getIconPath([array[i], array[i + 1], array[i + 2]]);
            }

            iconString = frameRow._icon;
            if((iconString === "" || iconString === undefined) && Gio.DesktopAppInfo.new(frameRow._cmd)){
                iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
            }
            //frameRow._gicon used in PW.DragRow
            frameRow._gicon = Gio.icon_new_for_string(iconString ? iconString : "");
            let arcMenuImage = new Gtk.Image( {
                gicon: frameRow._gicon,
                pixel_size: 22
            });
            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
            });
            frameRow.add_prefix(arcMenuImage);
            frameRow.add_prefix(dragImage);
            frameRow.title = _(frameRow._name);

            Utils.checkIfValidShortcut(frameRow, arcMenuImage);

            let buttonBox;
            if(this.listType === Constants.MenuSettingsListType.OTHER){
                frameRow.hasEditButton = true;
                buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow,
                    modifyButton: true,
                    changeButton: true
                });
                frameRow.activatable_widget = buttonBox.changeAppButton;
            }
            else{
                buttonBox = new PW.EditEntriesBox({
                    frameRow: frameRow,
                    modifyButton: editable,
                    deleteButton: true
                });
                frameRow.activatable_widget = buttonBox.editButton;
            }

            buttonBox.connect('modify', ()=> {
                let pinnedShortcut = [frameRow._name, frameRow._icon, frameRow._cmd];
                let dialog = new AddCustomLinkDialogWindow(this._settings, this, Constants.MenuSettingsListType.PINNED_APPS, pinnedShortcut);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        let newPinnedApps = dialog.newPinnedAppArray;
                        frameRow._name = newPinnedApps[0];
                        frameRow._icon = newPinnedApps[1];
                        frameRow._cmd = newPinnedApps[2];
                        frameRow.title = _(frameRow._name);
                        if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd))
                            arcMenuImage.gicon = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon();
                        else
                            arcMenuImage.gicon = Gio.icon_new_for_string(frameRow._icon);
                        dialog.destroy();
                        this.saveSettings();
                    }
                });
            });
            buttonBox.connect('change', ()=> {
                let dialog = new AddAppsToPinnedListWindow(this._settings, this, Constants.MenuSettingsListType.OTHER, this.settingString);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        let newPinnedApps = dialog.newPinnedAppArray;
                        frameRow._name = newPinnedApps[0];
                        frameRow._icon = newPinnedApps[1];
                        frameRow._cmd = newPinnedApps[2];
                        frameRow.title = _(frameRow._name);
                        let iconString;
                        if(frameRow._icon === "" && Gio.DesktopAppInfo.new(frameRow._cmd)){
                            iconString = Gio.DesktopAppInfo.new(frameRow._cmd).get_icon() ? Gio.DesktopAppInfo.new(frameRow._cmd).get_icon().to_string() : "";
                        }
                        let icon = Utils.getIconPath(newPinnedApps);
                        arcMenuImage.gicon = Gio.icon_new_for_string(iconString ? iconString : icon);
                        dialog.destroy();
                        this.saveSettings();
                    }
                });
            });
            buttonBox.connect("row-changed", () =>{
                this.saveSettings();
            });
            buttonBox.connect("row-deleted", () =>{
                this.frameRows.splice(this.frameRows.indexOf(frameRow), 1);
                this.saveSettings();
            });
            frameRow.connect("drag-drop-done", () => {
                this.saveSettings();
            });
            frameRow.add_suffix(buttonBox);
            this.frameRows.push(frameRow);
            this.frame.add(frameRow);
        }
    }
});

var AddAppsToPinnedListWindow = GObject.registerClass(
class ArcMenu_AddAppsToPinnedListWindow extends PW.DialogWindow {
    _init(settings, parent, dialogType, settingString) {
        this._settings = settings;
        this._dialogType = dialogType;
        this.settingString = settingString;

        if(this._dialogType === Constants.MenuSettingsListType.PINNED_APPS)
            super._init(_('Add to your Pinned Apps'), parent);
        else if(this._dialogType === Constants.MenuSettingsListType.OTHER)
            super._init(_('Change Selected Pinned App'), parent);
        else if(this._dialogType === Constants.MenuSettingsListType.APPLICATIONS)
            super._init(_('Select Application Shortcuts'), parent);
        else if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES)
            super._init(_('Select Directory Shortcuts'), parent);
        this.newPinnedAppArray = [];
        this._createPinnedAppsList();

        if(this._dialogType == Constants.MenuSettingsListType.PINNED_APPS){
            let extraItem = [[_("ArcMenu Settings"), Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg', Constants.ArcMenuSettingsCommand]];
            this._loadExtraCategories(extraItem);
            this._loadCategories();
        }
        else if(this._dialogType == Constants.MenuSettingsListType.DIRECTORIES){
            let extraLinks = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
            extraLinks.push([_("Computer"), "ArcMenu_Computer", "ArcMenu_Computer"]);
            extraLinks.push([_("Network"), "ArcMenu_Network", "ArcMenu_Network"]);
            extraLinks.push([_("Recent"), "document-open-recent-symbolic", "ArcMenu_Recent"]);
            this._loadExtraCategories(extraLinks);
        }
        else if(this._dialogType == Constants.MenuSettingsListType.APPLICATIONS){
            let extraLinks = [];
            extraLinks.push([_("Activities Overview"), "view-fullscreen-symbolic", "ArcMenu_ActivitiesOverview"]);
            extraLinks.push([_("ArcMenu Settings"), Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg', Constants.ArcMenuSettingsCommand]);
            extraLinks.push([_("Run Command..."), "system-run-symbolic", "ArcMenu_RunCommand"]);
            extraLinks.push([_("Show All Applications"), "view-fullscreen-symbolic", "ArcMenu_ShowAllApplications"]);
            this._loadExtraCategories(extraLinks);
            this._loadCategories();
        }
        else{
            let extraLinks = this._settings.get_default_value('directory-shortcuts-list').deep_unpack();
            extraLinks.push([_("Computer"), "ArcMenu_Computer", "ArcMenu_Computer"]);
            extraLinks.push([_("Network"), "ArcMenu_Network", "ArcMenu_Network"]);
            extraLinks.push([_("Lock"), "changes-prevent-symbolic", "ArcMenu_Lock"]);
            extraLinks.push([_("Log Out"), "system-log-out-symbolic", "ArcMenu_LogOut"]);
            extraLinks.push([_("Power Off"), "system-shutdown-symbolic", "ArcMenu_PowerOff"]);
            extraLinks.push([_("Restart"), 'system-reboot-symbolic', "ArcMenu_Restart"]);
            extraLinks.push([_("Suspend"), "media-playback-pause-symbolic", "ArcMenu_Suspend"]);
            extraLinks.push([_("Hybrid Sleep"), 'weather-clear-night-symbolic', "ArcMenu_HybridSleep"]);
            extraLinks.push([_("Hibernate"), "document-save-symbolic", "ArcMenu_Hibernate"]);
            this._loadExtraCategories(extraLinks);
            this._loadCategories();
        }
    }

    _createPinnedAppsList(){
        let appsList = this._settings.get_value(this.settingString).deep_unpack();
        if(this._dialogType !== Constants.MenuSettingsListType.PINNED_APPS){
            this.appsList = [];
            for(let i = 0; i < appsList.length; i++){
                this.appsList.push(appsList[i][0]);
                this.appsList.push(appsList[i][1]);
                this.appsList.push(appsList[i][2]);
            }
        }
        else
            this.appsList = appsList;
    }

    findCommandMatch(command){
        for(let i = 2; i < this.appsList.length; i += 3){
            if(this.appsList[i] === command)
                return true;
        }
        return false;
    }

    _loadExtraCategories(extraCategories){
        for(let item of extraCategories){
            let frameRow = new Adw.ActionRow({
                title: _(item[0])
            });

            let iconString;
            if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES || this._dialogType === Constants.MenuSettingsListType.OTHER)
                iconString = Utils.getIconPath([item[0], item[1], item[2]]);
            else
                iconString = item[1];

            frameRow._name = _(item[0]);
            frameRow._icon = item[1];
            frameRow._cmd = item[2];

            let iconImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string(iconString),
                pixel_size: 22
            });
            frameRow.add_prefix(iconImage);
            let match = this.findCommandMatch(frameRow._cmd);

            this.addButtonAction(frameRow, match);
            this.pageGroup.add(frameRow);
        }
    }

    _loadCategories() {
        let allApps = Gio.app_info_get_all();
        allApps.sort((a, b) => {
            let _a = a.get_display_name();
            let _b = b.get_display_name();
            return GLib.strcmp0(_a, _b);
        });

        for(let i = 0; i < allApps.length; i++) {
            if(allApps[i].should_show()) {
                let frameRow = new Adw.ActionRow();
                frameRow._app = allApps[i];
                frameRow._name = allApps[i].get_display_name();
                frameRow._icon = '';
                frameRow._cmd = allApps[i].get_id();
                frameRow.title = frameRow._name;

                let icon = allApps[i].get_icon() ? allApps[i].get_icon().to_string() : "dialog-information";

                let iconImage = new Gtk.Image( {
                    gicon: Gio.icon_new_for_string(icon),
                    pixel_size: 22
                });
                frameRow.add_prefix(iconImage);

                let match = this.findCommandMatch(allApps[i].get_id());

                this.addButtonAction(frameRow, match);
                this.pageGroup.add(frameRow);
            }
        }
    }

    addButtonAction(frameRow, match){
        if(this._dialogType == Constants.MenuSettingsListType.PINNED_APPS || this._dialogType == Constants.MenuSettingsListType.APPLICATIONS||
            this._dialogType == Constants.MenuSettingsListType.DIRECTORIES){
            let checkButton = new PW.Button({
                icon_name: match ? 'list-remove-symbolic' : 'list-add-symbolic',
                margin_end: 20
            });
            checkButton.connect('clicked', (widget) => {
                this.newPinnedAppArray = [frameRow._name, frameRow._icon, frameRow._cmd];

                if(!match){
                    this.currentToast?.dismiss();

                    this.currentToast = new Adw.Toast({
                        title: _("%s has been pinned to ArcMenu").format(frameRow._name),
                        timeout: 2
                    });
                    this.currentToast.connect("dismissed", () => this.currentToast = null);

                    this.add_toast(this.currentToast);
                    this.emit("response", Gtk.ResponseType.APPLY);
                }
                else{
                    this.currentToast?.dismiss();

                    this.currentToast = new Adw.Toast({
                        title: _("%s has been unpinned from ArcMenu").format(frameRow._name),
                        timeout: 2
                    });
                    this.currentToast.connect("dismissed", () => this.currentToast = null);

                    this.add_toast(this.currentToast);
                    this.emit("response", Gtk.ResponseType.REJECT);
                }

                match = !match;
                checkButton.icon_name = match ? 'list-remove-symbolic' : 'list-add-symbolic';
            });
            frameRow.add_suffix(checkButton);
            frameRow.activatable_widget = checkButton;
        }
        else{
            let checkButton = new PW.Button({
                icon_name: 'list-add-symbolic',
                margin_end: 20
            });
            checkButton.connect('clicked', () => {
                this.newPinnedAppArray = [frameRow._name, frameRow._icon, frameRow._cmd];
                this.emit("response", Gtk.ResponseType.APPLY);
            });
            frameRow.add_suffix(checkButton);
            frameRow.activatable_widget = checkButton;
        }
    }
});

var AddCustomLinkDialogWindow = GObject.registerClass(
class ArcMenu_AddCustomLinkDialogWindow extends PW.DialogWindow {
    _init(settings, parent, dialogType, pinnedShortcut = null) {
        let title = _('Add a Custom Shortcut');
        let isPinnedApps = this._dialogType === Constants.MenuSettingsListType.PINNED_APPS || this._dialogType === Constants.MenuSettingsListType.OTHER;
        if (pinnedShortcut && isPinnedApps)
            title = _('Edit Pinned App');
        else if (pinnedShortcut)
            title = _('Edit Shortcut');

        super._init(_(title), parent, Constants.MenuItemLocation.BOTTOM);
        this.set_default_size(550, 220);
        this._settings = settings;
        this.newPinnedAppArray = [];
        this._dialogType = dialogType;
        this.pinnedShortcut = pinnedShortcut;

        let nameFrameRow = new Adw.ActionRow({
            title: _('Title')
        });

        let nameEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            width_chars: 35
        });
        nameFrameRow.add_suffix(nameEntry);
        this.pageGroup.add(nameFrameRow);

        let iconFrameRow = new Adw.ActionRow({
            title: _('Icon')
        });
        let iconEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            width_chars: 35
        });

        let fileFilter = new Gtk.FileFilter();
        fileFilter.add_pixbuf_formats();
        let fileChooserButton = new Gtk.Button({
            label: _('Browse...'),
            valign: Gtk.Align.CENTER,
        });

        fileChooserButton.connect('clicked', (widget) => {
            let dialog = new Gtk.FileChooserDialog({
                title: _('Select an Icon'),
                transient_for: this.get_root(),
                modal: true,
                action: Gtk.FileChooserAction.OPEN,
            });
            dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
            dialog.add_button("_Open", Gtk.ResponseType.ACCEPT);

            dialog.set_filter(fileFilter);

            dialog.connect("response", (self, response) => {
                if(response === Gtk.ResponseType.ACCEPT){
                    let iconFilepath = dialog.get_file().get_path();
                    iconEntry.set_text(iconFilepath);
                    dialog.destroy();
                }
                else if(response === Gtk.ResponseType.CANCEL)
                    dialog.destroy();
            });
            dialog.show();
        });
        iconFrameRow.add_suffix(iconEntry);
        iconFrameRow.add_suffix(fileChooserButton);
        this.pageGroup.add(iconFrameRow);

        if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES)
            iconEntry.set_text("ArcMenu_Folder");

        let cmdFrameRow = new Adw.ActionRow({
            title: _('Command')
        });
        if(this._dialogType === Constants.MenuSettingsListType.DIRECTORIES)
            cmdFrameRow.title = _("Shortcut Path");

        let cmdEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            width_chars: 35
        });
        cmdFrameRow.add_suffix(cmdEntry);
        this.pageGroup.add(cmdFrameRow);

        let addButton = new Gtk.Button({
            label: this.pinnedShortcut ?_("Apply") :_("Add"),
            halign: Gtk.Align.END
        });
        let context = addButton.get_style_context();
        context.add_class('suggested-action');
        if(this.pinnedShortcut !== null) {
            nameEntry.text = this.pinnedShortcut[0];
            iconEntry.text = this.pinnedShortcut[1];
            cmdEntry.text = this.pinnedShortcut[2];
        }
        addButton.connect('clicked', ()=> {
            this.newPinnedAppArray.push(nameEntry.get_text());
            this.newPinnedAppArray.push(iconEntry.get_text());
            this.newPinnedAppArray.push(cmdEntry.get_text());
            this.emit('response', Gtk.ResponseType.APPLY);
        });

        this.headerGroup.add(addButton);
    }
});