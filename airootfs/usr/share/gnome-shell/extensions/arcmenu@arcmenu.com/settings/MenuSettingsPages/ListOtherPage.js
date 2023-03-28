const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var ListOtherPage = GObject.registerClass(
    class ArcMenu_ListOtherPage extends Gtk.Box {
    _init(settings, listType) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this.frameRows = [];
        this.listType = listType;

        if(this.listType === Constants.MenuSettingsListType.POWER_OPTIONS)
            this.settingString = 'power-options';
        else if(this.listType === Constants.MenuSettingsListType.EXTRA_CATEGORIES)
            this.settingString = 'extra-categories';
        else if(this.listType === Constants.MenuSettingsListType.QUICK_LINKS)
            this.settingString = 'arcmenu-extra-categories-links';

        this._settings = settings;
        this.categoriesFrame = new Adw.PreferencesGroup();

        this._createFrame(this._settings.get_value(this.settingString).deep_unpack());
        this.append(this.categoriesFrame);
        if(this.listType === Constants.MenuSettingsListType.POWER_OPTIONS){
            let powerDisplayStyleGroup = new Adw.PreferencesGroup({
                title: _("Power Off / Log Out Buttons")
            });
            let powerDisplayStyles = new Gtk.StringList();
            powerDisplayStyles.append(_('Default'));
            powerDisplayStyles.append(_('In-Line'));
            powerDisplayStyles.append(_('Sub Menu'));
            let powerDisplayStyleRow = new Adw.ComboRow({
                title: _("Display Style"),
                model: powerDisplayStyles,
                selected: this._settings.get_enum('power-display-style')
            });
            powerDisplayStyleRow.connect("notify::selected", (widget) => {
                this._settings.set_enum('power-display-style', widget.selected)
            });
            powerDisplayStyleGroup.add(powerDisplayStyleRow);
            this.append(powerDisplayStyleGroup);
        }

        this.restoreDefaults = () => {
            this.frameRows.forEach(child => {
                this.categoriesFrame.remove(child);
            });
            this.frameRows = [];

            this._createFrame(this._settings.get_default_value(this.settingString).deep_unpack());
            this.saveSettings();
        };
    }

    saveSettings(){
        let array = [];
        this.frameRows.sort((a, b) => {
            return a.get_index() > b.get_index();
        })
        this.frameRows.forEach(child => {
            array.push([child._enum, child._shouldShow]);
        });

        this._settings.set_value(this.settingString, new GLib.Variant('a(ib)', array));
    }

    _createFrame(extraCategories){
        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let name, iconString;
            if(this.listType === Constants.MenuSettingsListType.POWER_OPTIONS){
                name = Constants.PowerOptions[categoryEnum].NAME;
                iconString = Constants.PowerOptions[categoryEnum].ICON;
            }
            else {
                name = Constants.Categories[categoryEnum].NAME;
                iconString = Constants.Categories[categoryEnum].ICON
            }

            let frameRow = new PW.DragRow();
            frameRow._enum = extraCategories[i][0];
            frameRow._shouldShow = extraCategories[i][1];
            frameRow._name = _(name);
            //frameRow._gicon used in PW.DragRow
            frameRow._gicon = Gio.icon_new_for_string(iconString);
            frameRow.hasSwitch = true;
            frameRow.switchActive = frameRow._shouldShow;

            let applicationIcon = new Gtk.Image( {
                gicon: frameRow._gicon,
                pixel_size: 22
            });
            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
            });
            frameRow.add_prefix(applicationIcon);
            frameRow.add_prefix(dragImage);
            frameRow.title = _(name);

            let buttonBox = new PW.EditEntriesBox({
                frameRow: frameRow,
                frame: this.categoriesFrame
            });

            let modifyButton = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                margin_start: 10,
            });

            frameRow.activatable_widget = modifyButton;
            modifyButton.set_active(frameRow._shouldShow);
            modifyButton.connect('notify::active', ()=> {
                frameRow._shouldShow = modifyButton.get_active();
                this.saveSettings();
            });
            buttonBox.connect("row-changed", () =>{
                this.saveSettings();
            });
            frameRow.connect("drag-drop-done", () => {
                this.saveSettings();
            });
            buttonBox.insert_column(0);
            buttonBox.attach(Gtk.Separator.new(Gtk.Orientation.VERTICAL), 0, 0, 1, 1);
            buttonBox.insert_column(0);
            buttonBox.attach(modifyButton, 0, 0, 1, 1);

            frameRow.add_suffix(buttonBox);
            this.frameRows.push(frameRow);
            this.categoriesFrame.add(frameRow);
        }
    }
});