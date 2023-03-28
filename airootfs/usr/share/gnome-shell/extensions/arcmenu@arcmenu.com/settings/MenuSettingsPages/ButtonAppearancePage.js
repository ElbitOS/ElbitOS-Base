const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, Gio, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const PW = Me.imports.prefsWidgets;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var ButtonAppearancePage = GObject.registerClass(
class ArcMenu_ButtonAppearancePage extends Gtk.Box {
    _init(settings) {
        super._init({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 5,
            margin_end: 5,
            spacing: 20,
            orientation: Gtk.Orientation.VERTICAL
        });
        this._settings = settings;

        let menuButtonAppearanceFrame = new Adw.PreferencesGroup({
            title: _('Menu Button')
        });

        let menuButtonAppearances = new Gtk.StringList();
        menuButtonAppearances.append(_("Icon"));
        menuButtonAppearances.append(_("Text"));
        menuButtonAppearances.append(_("Icon and Text"));
        menuButtonAppearances.append(_("Text and Icon"));
        menuButtonAppearances.append(_("Hidden"));
        let menuButtonAppearanceRow = new Adw.ComboRow({
            title: _('Appearance'),
            model: menuButtonAppearances,
            selected: -1
        });
        menuButtonAppearanceRow.connect("notify::selected", (widget) => {
            if(widget.selected === Constants.MenuButtonAppearance.NONE){
                menuButtonOffsetRow.hide();
                menuButtonPaddingRow.hide();
                menuButtonCustomTextBoxRow.hide();
            }
            else if(widget.selected === Constants.MenuButtonAppearance.ICON){
                menuButtonPaddingRow.show();
                menuButtonCustomTextBoxRow.hide();
                menuButtonOffsetRow.show();
            }
            else{
                menuButtonPaddingRow.show();
                menuButtonOffsetRow.show();
                menuButtonCustomTextBoxRow.show();
            }
            this._settings.set_enum('menu-button-appearance', widget.selected);
        });

        let paddingScale = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: -1,
                upper: 25,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            valign: Gtk.Align.CENTER,
        });
        paddingScale.set_value(this._settings.get_int('button-padding'));
        paddingScale.connect('value-changed', () => {
            this._settings.set_int('button-padding', paddingScale.get_value());
        });
        let menuButtonPaddingRow = new Adw.ActionRow({
            title: _('Padding'),
            subtitle: _("%d Default Theme Value").format(-1),
            activatable_widget: paddingScale
        });
        menuButtonPaddingRow.add_suffix(paddingScale);

        ///// Row for menu button offset /////
        let offsetScale = new Gtk.SpinButton({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 10, // arbitrary value
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            valign: Gtk.Align.CENTER,
        });
        offsetScale.set_value(this._settings.get_int('menu-button-position-offset'));
        offsetScale.connect('value-changed', () => {
            this._settings.set_int('menu-button-position-offset', offsetScale.get_value());
        });
        let menuButtonOffsetRow = new Adw.ActionRow({
            title: _('Position in Panel'),
            activatable_widget: offsetScale
        });
        menuButtonOffsetRow.add_suffix(offsetScale);
        ////////////////////

        let menuButtonCustomTextEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
        });
        menuButtonCustomTextEntry.set_width_chars(30);
        menuButtonCustomTextEntry.set_text(this._settings.get_string('custom-menu-button-text'));
        menuButtonCustomTextEntry.connect('changed', (widget) => {
            let customMenuButtonText = widget.get_text();
            this._settings.set_string('custom-menu-button-text', customMenuButtonText);
        });
        let menuButtonCustomTextBoxRow = new Adw.ActionRow({
            title: _('Text'),
            activatable_widget: menuButtonCustomTextEntry
        });
        menuButtonCustomTextBoxRow.add_suffix(menuButtonCustomTextEntry);

        menuButtonAppearanceFrame.add(menuButtonAppearanceRow);
        menuButtonAppearanceFrame.add(menuButtonCustomTextBoxRow);
        menuButtonAppearanceFrame.add(menuButtonPaddingRow);
        menuButtonAppearanceFrame.add(menuButtonOffsetRow);
        this.append(menuButtonAppearanceFrame);

        let menuButtonIconFrame = new Adw.PreferencesGroup({
            title: _('Icon Settings')
        });
        let menuButtonIconButton = new PW.Button({
            title: _("Browse Icons") + " ",
            icon_name: 'icon-preview-symbolic',
            icon_first: true,
            valign: Gtk.Align.CENTER,
        });
        menuButtonIconButton.connect('clicked', () => {
            let dialog = new ArcMenuIconsDialogWindow(this._settings, this);
            dialog.show();
            dialog.connect('response', () => {
                dialog.destroy();
            });
        });
        let menuButtonIconRow = new Adw.ActionRow({
            title: _('Icon'),
            activatable_widget: menuButtonIconButton
        });
        menuButtonIconRow.add_suffix(menuButtonIconButton);
        menuButtonIconFrame.add(menuButtonIconRow);

        let menuButtonIconSizeScale = new Gtk.SpinButton({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 14,
                upper: 64,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            valign: Gtk.Align.CENTER,
        });
        menuButtonIconSizeScale.set_value(this._settings.get_double('custom-menu-button-icon-size'));
        menuButtonIconSizeScale.connect('value-changed', () => {
            this._settings.set_double('custom-menu-button-icon-size', menuButtonIconSizeScale.get_value());
        });
        let menuButtonIconSizeRow = new Adw.ActionRow({
            title: _('Icon Size'),
            activatable_widget: menuButtonIconSizeScale
        });
        menuButtonIconSizeRow.add_suffix(menuButtonIconSizeScale);
        menuButtonIconFrame.add(menuButtonIconSizeRow);

        menuButtonAppearanceRow.selected = this._settings.get_enum('menu-button-appearance');

        this.append(menuButtonIconFrame);

        let menuButtonGroup = new Adw.PreferencesGroup({
            title: _("Menu Button Styling"),
            description: _("Results may vary with third party themes")
        });
        this.append(menuButtonGroup);

        let buttonFGColorRow = this._createButtonColorRow(_("Foreground Color"), 'menu-button-fg-color');
        menuButtonGroup.add(buttonFGColorRow);

        let buttonHoverBGColorRow = this._createButtonColorRow(_("Hover") + " " + _("Background Color"), 'menu-button-hover-bg-color');
        menuButtonGroup.add(buttonHoverBGColorRow);

        let buttonHoverFGColorRow = this._createButtonColorRow(_("Hover") + " " + _("Foreground Color"), 'menu-button-hover-fg-color');
        menuButtonGroup.add(buttonHoverFGColorRow);

        let buttonActiveBGColorRow = this._createButtonColorRow(_("Active") + " " + _("Background Color"), 'menu-button-active-bg-color');
        menuButtonGroup.add(buttonActiveBGColorRow);

        let buttonActiveFGColorRow = this._createButtonColorRow(_("Active") + " " + _("Foreground Color"), 'menu-button-active-fg-color');
        menuButtonGroup.add(buttonActiveFGColorRow);

        let buttonBorderRadiusRow = this._createSpinButtonToggleRow(_("Border Radius"), 'menu-button-border-radius', 0, 25);
        menuButtonGroup.add(buttonBorderRadiusRow);

        let buttonBorderWidthRow = this._createSpinButtonToggleRow(_("Border Width"), 'menu-button-border-width', 0, 5, _("Background colors required if set to 0"));
        menuButtonGroup.add(buttonBorderWidthRow);

        let buttonBorderColorRow = this._createButtonColorRow(_("Border Color"), 'menu-button-border-color');
        menuButtonGroup.add(buttonBorderColorRow);

        this.restoreDefaults = () => {
            menuButtonAppearanceRow.selected = 0;
            menuButtonCustomTextEntry.set_text('Applications');
            paddingScale.set_value(-1);
            menuButtonIconSizeScale.set_value(20);
            offsetScale.set_value(0);

            buttonFGColorRow.restoreDefaults();
            buttonHoverBGColorRow.restoreDefaults();
            buttonHoverFGColorRow.restoreDefaults();
            buttonActiveBGColorRow.restoreDefaults();
            buttonActiveFGColorRow.restoreDefaults();
            buttonBorderRadiusRow.restoreDefaults();
            buttonBorderWidthRow.restoreDefaults();
            buttonBorderColorRow.restoreDefaults();

            this._settings.reset('menu-button-icon');
            this._settings.reset('arc-menu-icon');
            this._settings.reset('distro-icon');
            this._settings.reset('custom-menu-button-icon');
            this._settings.reset('menu-button-position-offset');
            this._settings.reset('menu-button-fg-color');
            this._settings.reset('menu-button-hover-bg-color');
            this._settings.reset('menu-button-hover-fg-color');
            this._settings.reset('menu-button-active-bg-color');
            this._settings.reset('menu-button-active-fg-color');
            this._settings.reset('menu-button-border-radius');
            this._settings.reset('menu-button-border-width');
            this._settings.reset('menu-button-border-color');
        };
    }

    _createSpinButtonToggleRow(title, setting, lower, upper, subtitle = ''){
        let [enabled, value] = this._settings.get_value(setting).deep_unpack();

        let enabledSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        enabledSwitch.connect('notify::active', (widget) => {
            let [oldEnabled_, oldValue] = this._settings.get_value(setting).deep_unpack();
            this._settings.set_value(setting, new GLib.Variant('(bi)', [widget.get_active(), oldValue]));
            if(widget.get_active())
                spinButton.set_sensitive(true);
            else
                spinButton.set_sensitive(false);
        });
        let spinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower,
                upper,
                step_increment: 1
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            value: value,
            sensitive: enabled
        });
        spinButton.connect('value-changed', (widget) => {
            let [oldEnabled, oldValue_] = this._settings.get_value(setting).deep_unpack();
            this._settings.set_value(setting, new GLib.Variant('(bi)', [oldEnabled, widget.get_value()]));
        });

        let spinRow = new Adw.ActionRow({
            title: _(title),
            subtitle: subtitle ? _(subtitle) : "",
            activatable_widget: enabledSwitch
        });
        spinRow.add_suffix(enabledSwitch);
        spinRow.add_suffix(new Gtk.Separator({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 10,
            margin_bottom: 10
        }));
        spinRow.add_suffix(spinButton);

        enabledSwitch.set_active(enabled);

        spinRow.restoreDefaults = () => {
            let [defaultEnabled, defaultValue] = this._settings.get_default_value(setting).deep_unpack();
            enabledSwitch.set_active(defaultEnabled);
            spinButton.value = defaultValue;
        }
        return spinRow;
    }

    _createButtonColorRow(title, setting){
        let [enabled, color] = this._settings.get_value(setting).deep_unpack();

        let enabledSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        enabledSwitch.connect('notify::active', (widget) => {
            let [oldEnabled_, oldColor] = this._settings.get_value(setting).deep_unpack();
            this._settings.set_value(setting, new GLib.Variant('(bs)', [widget.get_active(), oldColor]));
            if(widget.get_active())
                colorButton.set_sensitive(true);
            else
                colorButton.set_sensitive(false);
        });

        let colorButton = new Gtk.ColorButton({
            use_alpha: true,
            valign: Gtk.Align.CENTER,
            rgba: Utils.parseRGBA(color),
            sensitive: enabled
        });
        colorButton.connect('notify::rgba', (widget) => {
            let colorString = widget.get_rgba().to_string();
            let [oldEnabled, oldColor_] = this._settings.get_value(setting).deep_unpack();
            this._settings.set_value(setting, new GLib.Variant('(bs)', [oldEnabled, colorString]));
        });

        let colorRow = new Adw.ActionRow({
            title: _(title),
            activatable_widget: enabledSwitch
        });
        colorRow.add_suffix(enabledSwitch);
        colorRow.add_suffix(new Gtk.Separator({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 10,
            margin_bottom: 10
        }));
        colorRow.add_suffix(colorButton);

        enabledSwitch.set_active(enabled);

        colorRow.restoreDefaults = () => {
            let [defaultEnabled, defaultColor] = this._settings.get_default_value(setting).deep_unpack();
            enabledSwitch.set_active(defaultEnabled);
            colorButton.rgba = Utils.parseRGBA(defaultColor);
        }
        return colorRow;
    }
});

var ArcMenuIconsDialogWindow = GObject.registerClass(
class ArcMenu_ArcMenuIconsDialogWindow extends PW.DialogWindow {
    _init(settings, parent) {
        this._settings = settings;
        super._init(_('ArcMenu Icons'), parent, Constants.MenuItemLocation.TOP);
        this.set_default_size(475, 400);
        this.search_enabled = false;

        let arcMenuIconsFlowBox = new PW.IconGrid();
        this.page.title = _("ArcMenu Icons");
        this.page.icon_name = 'arcmenu-logo-symbolic';
        arcMenuIconsFlowBox.connect('child-activated', ()=> {
            distroIconsBox.unselect_all();
            customIconFlowBox.unselect_all();
            let selectedChild = arcMenuIconsFlowBox.get_selected_children();
            let selectedChildIndex = selectedChild[0].get_index();
            this._settings.set_enum('menu-button-icon', Constants.MenuIcon.ARCMENU_ICON);
            this._settings.set_int('arc-menu-icon', selectedChildIndex);
        });
        this.pageGroup.add(arcMenuIconsFlowBox);

        Constants.MenuIcons.forEach((icon)=>{
            let iconName = icon.PATH.replace("/media/icons/menu_button_icons/icons/", '');
            iconName = iconName.replace(".svg", '');
            let iconImage = new Gtk.Image({
                icon_name: iconName,
                pixel_size: 36
            });
            arcMenuIconsFlowBox.add(iconImage);
        });

        this.distroIconsPage = new Adw.PreferencesPage({
            title: _("Distro Icons"),
            icon_name: 'start-here-symbolic'
        });
        let distroIconsGroup = new Adw.PreferencesGroup();
        this.distroIconsPage.add(distroIconsGroup)
        this.add(this.distroIconsPage);
        let distroIconsBox = new PW.IconGrid();
        distroIconsBox.connect('child-activated', ()=> {
            arcMenuIconsFlowBox.unselect_all();
            customIconFlowBox.unselect_all();
            let selectedChild = distroIconsBox.get_selected_children();
            let selectedChildIndex = selectedChild[0].get_index();
            this._settings.set_enum('menu-button-icon', Constants.MenuIcon.DISTRO_ICON);
            this._settings.set_int('distro-icon', selectedChildIndex);
        });
        Constants.DistroIcons.forEach((icon)=>{
            let iconImage;
            if(icon.PATH === 'start-here-symbolic'){
                iconImage = new Gtk.Image({
                    icon_name: 'start-here-symbolic',
                    pixel_size: 36
                });
            }
            else{
                let iconName1 = icon.PATH.replace("/media/icons/menu_button_icons/distro_icons/", '');
                iconName1 = iconName1.replace(".svg", '');
                iconImage = new Gtk.Image({
                    icon_name: iconName1,
                    pixel_size: 36
                });
            }
            distroIconsBox.add(iconImage);
        });
        distroIconsGroup.add(distroIconsBox);

        this.customIconPage = new Adw.PreferencesPage({
            title: _("Custom Icon"),
            icon_name: 'icon-preview-symbolic'
        });
        let customIconGroup = new Adw.PreferencesGroup();
        this.customIconPage.add(customIconGroup);
        this.add(this.customIconPage);

        let customIconBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });
        let customIconFlowBox = new PW.IconGrid();
        customIconFlowBox.vexpand = false;
        customIconFlowBox.homogeneous = false;
        customIconFlowBox.connect('child-activated', ()=> {
            arcMenuIconsFlowBox.unselect_all();
            distroIconsBox.unselect_all();
            let customIconPath = this._settings.get_string('custom-menu-button-icon');
            this._settings.set_string('custom-menu-button-icon', customIconPath)
            this._settings.set_enum('menu-button-icon', Constants.MenuIcon.CUSTOM);
        });
        customIconBox.append(customIconFlowBox);
        let customIconImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string(this._settings.get_string('custom-menu-button-icon')),
            pixel_size: 36
        });
        customIconFlowBox.add(customIconImage);

        let fileChooserFrame = new Adw.PreferencesGroup();
        fileChooserFrame.margin_top = 20;
        fileChooserFrame.margin_bottom = 20;
        fileChooserFrame.margin_start = 20;
        fileChooserFrame.margin_end = 20;
        let fileChooserRow = new Adw.ActionRow({
            title: _('Custom Icon'),
        });

        let fileFilter = new Gtk.FileFilter();
        fileFilter.add_pixbuf_formats();
        let fileChooserButton = new Gtk.Button({
            label: _('Browse...'),
            valign: Gtk.Align.CENTER
        });
        fileChooserButton.connect('clicked', (widget) => {
            let dialog = new Gtk.FileChooserDialog({
                title: _('Select an Icon'),
                transient_for: this.get_root(),
                modal: true,
                action: Gtk.FileChooserAction.OPEN,
            });
            if(dialog.get_parent())
                dialog.unparent();
            dialog.set_filter(fileFilter);

            dialog.add_button("_Cancel", Gtk.ResponseType.CANCEL);
            dialog.add_button("_Open", Gtk.ResponseType.ACCEPT);

            dialog.connect("response", (self, response) => {
                if(response === Gtk.ResponseType.ACCEPT){
                    arcMenuIconsFlowBox.unselect_all();
                    distroIconsBox.unselect_all();
                    customIconImage.gicon = Gio.icon_new_for_string(dialog.get_file().get_path());
                    this._settings.set_string('custom-menu-button-icon', dialog.get_file().get_path());
                    this._settings.set_enum('menu-button-icon', Constants.MenuIcon.CUSTOM);
                    customIconFlowBox.select_child(customIconFlowBox.get_child_at_index(0));
                    dialog.destroy();
                }
                else
                    dialog.destroy();
            })
            dialog.show();
        });

        fileChooserRow.add_suffix(fileChooserButton);
        fileChooserFrame.add(fileChooserRow);
        customIconBox.append(fileChooserFrame);
        customIconGroup.add(customIconBox);

        if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARCMENU_ICON){
            let children = arcMenuIconsFlowBox.childrenCount;
            for(let i = 0; i < children; i++){
                if(i === this._settings.get_int('arc-menu-icon')){
                    arcMenuIconsFlowBox.select_child(arcMenuIconsFlowBox.get_child_at_index(i));
                    break;
                }
            }
        }
        else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON){
            let children = distroIconsBox.childrenCount;
            for(let i = 0; i < children; i++){
                if(i === this._settings.get_int('distro-icon')){
                    distroIconsBox.select_child(distroIconsBox.get_child_at_index(i));
                    break;
                }
            }
        }
        else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM){
            customIconFlowBox.select_child(customIconFlowBox.get_child_at_index(0));
        }

        let distroInfoButtonGroup = new Adw.PreferencesGroup();
        let distroInfoButton = new PW.Button({
            icon_name: 'help-about-symbolic',
            halign: Gtk.Align.START
        });
        distroInfoButton.connect('clicked', ()=> {
            let dialog = new DistroIconsDisclaimerWindow(this._settings, this);
            dialog.connect ('response', ()=> dialog.destroy());
            dialog.show();
        });
        distroInfoButtonGroup.add(distroInfoButton);
        this.distroIconsPage.add(distroInfoButtonGroup);
        this.page.remove(this.headerGroup);

        this.setVisibleChild();
    }

    setVisibleChild(){
        if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.ARCMENU_ICON)
            this.set_visible_page(this.page);
        else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.DISTRO_ICON)
            this.set_visible_page(this.distroIconsPage);
        else if(this._settings.get_enum('menu-button-icon') === Constants.MenuIcon.CUSTOM)
            this.set_visible_page(this.customIconPage);
    }
});

var DistroIconsDisclaimerWindow = GObject.registerClass(
class ArcMenu_DistroIconsDisclaimerWindow extends Gtk.MessageDialog {
    _init(settings, parent) {
        this._settings = settings;
        super._init({
            text: "<b>" + _("Legal disclaimer for Distro Icons") + "</b>",
            use_markup: true,
            message_type: Gtk.MessageType.OTHER,
            transient_for: parent.get_root(),
            modal: true,
            buttons: Gtk.ButtonsType.OK
        });

        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            homogeneous: false,
            margin_top: 5,
            margin_bottom: 5,
            margin_start: 5,
            margin_end: 5,
        });
        this.get_content_area().append(vbox);
        this._createLayout(vbox);
    }

    _createLayout(vbox) {
        let scrollWindow = new Gtk.ScrolledWindow({
            min_content_width: 500,
            max_content_width: 500,
            min_content_height: 400,
            max_content_height: 400,
            hexpand: false,
            halign: Gtk.Align.START,
        });
        scrollWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        let frame = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            halign: Gtk.Align.START
        });

        let bodyLabel = new Gtk.Label({
            label: Constants.DistroIconsDisclaimer,
            use_markup: true,
            hexpand: false,
            halign: Gtk.Align.START,
            wrap: true
        });
        bodyLabel.set_size_request(500,-1);

        frame.append(bodyLabel);
        scrollWindow.set_child(frame);
        vbox.append(scrollWindow);
    }
});