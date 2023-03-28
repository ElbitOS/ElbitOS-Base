const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var ManageThemesDialog = GObject.registerClass(
class ArcMenu_ManageThemesDialog extends PW.DialogWindow {
    _init(settings, parent) {
        super._init(_('Manage Themes'), parent);
        this._settings = settings;
        this.frameRows = [];

        let menuThemes = this._settings.get_value('menu-themes').deep_unpack();
        for(let i = 0; i < menuThemes.length; i++) {
            let theme = menuThemes[i];

            let themeRow = new PW.DragRow({
                title: theme[0]
            });
            themeRow.theme = theme;

            let xpm = Utils.createXpmImage(theme[1], theme[2], theme[3], theme[8]);
            let themePreviewImage = new Gtk.Image({
                hexpand: false,
                margin_end: 5,
                pixel_size: 42
            });
            themePreviewImage.set_from_pixbuf(GdkPixbuf.Pixbuf.new_from_xpm_data(xpm));

            themeRow._gicon = xpm;
            themeRow._name = theme[0];

            let dragImage = new Gtk.Image( {
                gicon: Gio.icon_new_for_string("drag-symbolic"),
                pixel_size: 12
            });
            themeRow.add_prefix(themePreviewImage);
            themeRow.add_prefix(dragImage);
            this.pageGroup.add(themeRow);

            let buttonBox = new PW.EditEntriesBox({
                frameRow: themeRow,
                modifyButton: true,
                deleteButton: true
            });
            themeRow.activatable_widget = buttonBox.editButton;
            buttonBox.connect('modify', () => {
                let dialog = new SaveThemeDialog(this._settings, this, theme[0]);
                dialog.show();
                dialog.connect('response', (_w, response) => {
                    if(response === Gtk.ResponseType.APPLY) {
                        theme.splice(0, 1, dialog.themeName);
                        themeRow.title = dialog.themeName;
                        themeRow.theme = theme;
                        this.saveSettings();
                        dialog.destroy();
                    }
                });
            });

            buttonBox.connect("row-changed", () =>{
                this.saveSettings();
            });
            buttonBox.connect("row-deleted", () =>{
                this.frameRows.splice(this.frameRows.indexOf(themeRow), 1);
                this.saveSettings();
            });
            themeRow.connect("drag-drop-done", () => {
                this.saveSettings();
            });

            themeRow.add_suffix(buttonBox);
            this.frameRows.push(themeRow);
        }
    }

    saveSettings(){
        let array = [];

        this.frameRows.sort((a, b) => {
            return a.get_index() > b.get_index();
        });

        this.frameRows.forEach(child => {
            array.push(child.theme);
        });

        this._settings.set_value('menu-themes', new GLib.Variant('aas', array));
        this.emit('response', Gtk.ResponseType.APPLY);
    }
});

var SaveThemeDialog = GObject.registerClass(
class ArcMenu_SaveThemeDialog extends PW.DialogWindow {
    _init(settings, parent, themeName) {
        super._init(_('Save Theme As...'), parent, Constants.MenuItemLocation.BOTTOM);
        this._settings = settings;
        this.themeName = themeName;
        this.search_enabled = false;
        this.set_default_size(550, 220);

        let themeNameEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            width_chars: 35
        });
        let themeNameRow = new Adw.ActionRow({
            title: _("Theme Name"),
            activatable_widget: themeNameEntry,
        });
        themeNameRow.add_suffix(themeNameEntry);
        this.pageGroup.add(themeNameRow);

        if(this.themeName)
            themeNameEntry.set_text(this.themeName);

        themeNameEntry.connect('changed',() => {
            if(themeNameEntry.get_text().length > 0)
                saveButton.set_sensitive(true);
            else
                saveButton.set_sensitive(false);
        });

        let saveButton = new Gtk.Button({
            label: _("Save Theme"),
            sensitive: false,
            halign: Gtk.Align.END
        });

        let context = saveButton.get_style_context();
        context.add_class('suggested-action');

        saveButton.connect('clicked', ()=> {
            this.themeName = themeNameEntry.get_text();
            this.emit('response', Gtk.ResponseType.APPLY);
        });
        this.headerGroup.add(saveButton);
    }
});
        