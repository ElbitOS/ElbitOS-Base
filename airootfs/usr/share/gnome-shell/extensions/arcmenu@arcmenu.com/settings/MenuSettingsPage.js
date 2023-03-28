const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Prefs = Me.imports.prefs;
const PW = Me.imports.prefsWidgets;
const _ = Gettext.gettext;

const { GeneralPage } = Me.imports.settings.MenuSettingsPages.GeneralPage;
const { ButtonAppearancePage } = Me.imports.settings.MenuSettingsPages.ButtonAppearancePage;
const { ListPinnedPage } = Me.imports.settings.MenuSettingsPages.ListPinnedPage;
const { ListOtherPage } = Me.imports.settings.MenuSettingsPages.ListOtherPage;
const { SearchOptionsPage } = Me.imports.settings.MenuSettingsPages.SearchOptionsPage;
const { FineTunePage } = Me.imports.settings.MenuSettingsPages.FineTunePage;

var MenuSettingsPage = GObject.registerClass(
class ArcMenu_MenuSettingsPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Customize'),
            icon_name: 'menu-settings-symbolic',
            name: 'MenuSettingsPage'
        });
        this._settings = settings;
        this.mainGroup = new Adw.PreferencesGroup();
        this.add(this.mainGroup);

        this.settingsLeaflet = new Adw.Leaflet({
            homogeneous: true,
            transition_type: Adw.LeafletTransitionType.SLIDE,
            can_navigate_back: true,
            can_navigate_forward: true,
            can_unfold: true,
        });

        this.headerLabel = new Gtk.Label({
            label: _("Menu Settings"),
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            hexpand: true,
            halign: Gtk.Align.CENTER
        });
        let context = this.headerLabel.get_style_context();
        context.add_class('title-4');

        this.menuSettingsStackListBox = new PW.StackListBox(this);
        context = this.menuSettingsStackListBox.get_style_context();
        context.add_class('navigation-sidebar');
        context.add_class('background');
        this.menuSettingsStackListBox.addRow("MenuSettingsGeneral", _("Menu Settings"), 'menu-settings-symbolic');
        this.menuSettingsStackListBox.addRow("ButtonSettings", _("Button Settings"), 'arc-menu-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsPinnedApps", _("Pinned Apps"), 'view-pin-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsShortcutDirectories", _("Directory Shortcuts"), 'folder-documents-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsShortcutApplications", _("Application Shortcuts"), 'preferences-desktop-apps-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsPowerOptions", _("Power Options"), 'gnome-power-manager-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsSearchOptions", _("Search Options"), 'preferences-system-search-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsCategories", _("Extra Categories"), 'view-list-symbolic');
        this.menuSettingsStackListBox.addRow("MenuSettingsFineTune", _("Fine-Tune"), 'fine-tune-symbolic');
        this.menuSettingsStackListBox.setSeparatorIndices([2, 5, 8]);

        this.populateSettingsLeaflet();

        this.settingsLeaflet.connect('notify::visible-child', () => {
            const visibleChild = this.settingsLeaflet.get_visible_child();
            const currentPage = this.settingsLeaflet.get_page(visibleChild);
            const pageName = currentPage.translatableName;
            this.headerLabel.label = _(pageName);
            this.menuSettingsStackListBox.selectRowByName(currentPage.name);
            let nextChild = this.settingsLeaflet.get_adjacent_child(Adw.NavigationDirection.FORWARD);
            goNextButton.sensitive = nextChild ? true : false;
            let previousChild = this.settingsLeaflet.get_adjacent_child(Adw.NavigationDirection.BACK);
            goPreviousButton.sensitive = previousChild ? true : false;
        });

        this.flap = new Adw.Flap({
            content: this.settingsLeaflet,
            flap: this.menuSettingsStackListBox,
            separator: Gtk.Separator.new(Gtk.Orientation.VERTICAL),
            fold_policy: Adw.FlapFoldPolicy.ALWAYS,
            flap_position: Gtk.PackType.END
        });

        this.menuSettingsStackListBox.connect('row-activated', () => {
            this.flap.reveal_flap = false;
        });

        let sidebarButton = new Gtk.ToggleButton({
            icon_name: 'view-more-symbolic',
            hexpand: true,
            vexpand: false,
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            tooltip_text: _("View Sidebar")
        });
        context = sidebarButton.get_style_context();
        context.add_class('suggested-action');
        sidebarButton.bind_property('active', this.flap, 'reveal-flap', GObject.BindingFlags.BIDIRECTIONAL);

        let navBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_bottom: 15,
        });
        let headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
        });

        let restoreDefaultsButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            vexpand: false,
            valign: Gtk.Align.CENTER,
            tooltip_text: _("Reset settings")
        });
        context = restoreDefaultsButton.get_style_context();
        context.add_class('destructive-action');
        restoreDefaultsButton.connect("clicked", () => {
            const visibleChild = this.settingsLeaflet.get_visible_child()
            const currentPage = this.settingsLeaflet.get_page(visibleChild);
            const pageName = currentPage.translatableName;
            let dialog = new Gtk.MessageDialog({
                text: "<b>" + _("Reset all %s?").format(pageName) + '</b>',
                secondary_text: _("All %s will be reset to the default value.").format(pageName),
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true
            });
            dialog.connect('response', (widget, response) => {
                if(response == Gtk.ResponseType.YES){
                    if(!visibleChild)
                        return;
                    if(visibleChild.restoreDefaults)
                        visibleChild.restoreDefaults();
                }
                dialog.destroy();
            });
            dialog.show();
        });

        let goNextButton = new Gtk.Button({
            icon_name: 'go-next-symbolic',
            halign: Gtk.Align.END,
            tooltip_text: _("Next Page")
        });
        context = goNextButton.get_style_context();
        context.add_class('pill');
        context.add_class('suggested-action');

        goNextButton.connect('clicked', (widget) => {
            this.settingsLeaflet.navigate(Adw.NavigationDirection.FORWARD);
        });
        let goPreviousButton = new Gtk.Button({
            icon_name: 'go-previous-symbolic',
            sensitive: false,
            tooltip_text: _("Previous Page")
        });
        context = goPreviousButton.get_style_context();
        context.add_class('pill');
        context.add_class('suggested-action');

        goPreviousButton.connect('clicked', (widget) => {
            this.settingsLeaflet.navigate(Adw.NavigationDirection.BACK);
        });

        navBox.append(goPreviousButton);
        navBox.append(this.headerLabel);
        navBox.append(goNextButton);

        headerBox.append(restoreDefaultsButton);
        headerBox.append(sidebarButton);

        this.mainGroup.add(navBox);
        this.mainGroup.add(headerBox);
        this.mainGroup.add(this.flap);

        this.settingsLeaflet.set_visible_child_name("MenuSettingsGeneral");
        this.menuSettingsStackListBox.selectFirstRow();
    }

    populateSettingsLeaflet(){
        let leafletPage = this.settingsLeaflet.append(new GeneralPage(this._settings));
        leafletPage.name = "MenuSettingsGeneral";
        leafletPage.translatableName = _("Menu Settings");

        leafletPage = this.settingsLeaflet.append(new ButtonAppearancePage(this._settings));
        leafletPage.name = "ButtonSettings";
        leafletPage.translatableName = _("Button Settings");

        leafletPage = this.settingsLeaflet.append(new ListPinnedPage(this._settings, Constants.MenuSettingsListType.PINNED_APPS));
        leafletPage.name = "MenuSettingsPinnedApps";
        leafletPage.translatableName = _("Pinned Apps");

        let pinnedPage = this.settingsLeaflet.get_child_by_name("MenuSettingsPinnedApps");

        if(this.pinnedAppsChangedID){
            this._settings.disconnect(this.pinnedAppsChangedID);
            this.pinnedAppsChangedID = null;
        }
        this.pinnedAppsChangedID = this._settings.connect("changed::pinned-app-list", () =>{
            pinnedPage.frameRows.forEach(child => {
                pinnedPage.frame.remove(child);
            });

            pinnedPage.frameRows = [];
            pinnedPage._createFrame(this._settings.get_strv('pinned-app-list'));
        });

        leafletPage = this.settingsLeaflet.append(new ListPinnedPage(this._settings, Constants.MenuSettingsListType.DIRECTORIES));
        leafletPage.name = "MenuSettingsShortcutDirectories";
        leafletPage.translatableName = _("Directory Shortcuts");

        leafletPage = this.settingsLeaflet.append(new ListPinnedPage(this._settings, Constants.MenuSettingsListType.APPLICATIONS));
        leafletPage.name = "MenuSettingsShortcutApplications";
        leafletPage.translatableName = _("Application Shortcuts");

        leafletPage = this.settingsLeaflet.append(new ListOtherPage(this._settings, Constants.MenuSettingsListType.POWER_OPTIONS));
        leafletPage.name = "MenuSettingsPowerOptions";
        leafletPage.translatableName = _("Power Options");

        leafletPage = this.settingsLeaflet.append(new SearchOptionsPage(this._settings));
        leafletPage.name = "MenuSettingsSearchOptions";
        leafletPage.translatableName = _("Search Options");

        leafletPage = this.settingsLeaflet.append(new ListOtherPage(this._settings, Constants.MenuSettingsListType.EXTRA_CATEGORIES));
        leafletPage.name = "MenuSettingsCategories";
        leafletPage.translatableName = _("Extra Categories");

        leafletPage = this.settingsLeaflet.append(new FineTunePage(this._settings));
        leafletPage.name = "MenuSettingsFineTune";
        leafletPage.translatableName = _("Fine-Tune");
    }
});