const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Gio, GLib} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const PowerManagerInterface = `<node>
  <interface name="org.freedesktop.login1.Manager">
    <method name="HybridSleep">
      <arg type="b" direction="in"/>
    </method>
    <method name="CanHybridSleep">
      <arg type="s" direction="out"/>
    </method>
    <method name="Hibernate">
      <arg type="b" direction="in"/>
    </method>
    <method name="CanHibernate">
      <arg type="s" direction="out"/>
    </method>
  </interface>
</node>`;
const PowerManager = Gio.DBusProxy.makeProxyWrapper(PowerManagerInterface);

function activateHibernate(){
    let proxy = new PowerManager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');
    proxy.CanHibernateRemote((result, error) => {
        if(error || result[0] !== 'yes')
            imports.ui.main.notifyError(_("ArcMenu - Hibernate Error!"), _("System unable to hibernate."));
        else{
            proxy.HibernateRemote(true);
        }
    });
}

function activateHybridSleep(){
    let proxy = new PowerManager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');
    proxy.CanHybridSleepRemote((result, error) => {
        if(error || result[0] !== 'yes')
            imports.ui.main.notifyError(_("ArcMenu - Hybrid Sleep Error!"), _("System unable to hybrid sleep."));
        else{
            proxy.HybridSleepRemote(true);
        }
    });
}

function getMenuLayout(menuButton, layoutEnum, isStandaloneRunner){
    let MenuLayouts = Me.imports.menulayouts;

    if(layoutEnum === Constants.MenuLayout.GNOME_OVERVIEW)
        return null;

    for(let menuLayout in MenuLayouts){
        const layoutClass = MenuLayouts[menuLayout];
        if(layoutClass.getMenuLayoutEnum() === layoutEnum)
            return new layoutClass.createMenu(menuButton, isStandaloneRunner);
    }
    
    return new MenuLayouts.arcmenu.createMenu(menuButton, isStandaloneRunner);
}

function getSettings(schema, extensionUUID) {
    let extension = imports.ui.main.extensionManager.lookup(extensionUUID);

    if (!extension)
        throw new Error('ArcMenu - getSettings() unable to find extension');

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // Expect USER extensions to have a schemas/ subfolder, otherwise assume a
    // SYSTEM extension that has been installed in the same prefix as the shell
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null)) {
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                                GioSSS.get_default(),
                                                false);
    } else {
        schemaSource = GioSSS.get_default();
    }

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error(`Schema ${schema} could not be found for extension ${extension.metadata.uuid}. Please check your installation`);

    return new Gio.Settings({ settings_schema: schemaObj });
}

var SettingsConnectionsHandler = class ArcMenu_SettingsConnectionsHandler {
    constructor(settings){
        this._settings = settings;
        this._connections = new Map();
        this._eventPrefix = 'changed::';
    }

    connect(event, callback){
        this._connections.set(this._settings.connect(this._eventPrefix + event, callback), this._settings);
    }

    connectMultipleEvents(events, callback){
        for(let event of events)
            this._connections.set(this._settings.connect(this._eventPrefix + event, callback), this._settings);
    }

    destroy(){
        this._connections.forEach((object, id) => {
            object.disconnect(id);
            id = null;
        });

        this._connections = null;
    }
}

function convertToGridLayout(item){
    const Clutter = imports.gi.Clutter;
    const settings = item._settings;
    const layoutProperties = item._menuLayout.layoutProperties;

    let icon = item._icon ? item._icon : item._iconBin;

    item.vertical = true;
    if(item._ornamentLabel)
        item.remove_child(item._ornamentLabel);

    item.tooltipLocation = Constants.TooltipLocation.BOTTOM_CENTERED;
    item.label.x_align = item.label.y_align = Clutter.ActorAlign.CENTER;
    item.label.y_expand = true;

    icon.y_align = Clutter.ActorAlign.CENTER;
    icon.y_expand = true;
    if(settings.get_boolean('multi-lined-labels')){
        icon.y_align = Clutter.ActorAlign.TOP;
        icon.y_expand = false;

        let clutterText = item.label.get_clutter_text();
        clutterText.set({
            line_wrap: true,
            line_wrap_mode: imports.gi.Pango.WrapMode.WORD_CHAR,
        });
    }

    if(item._indicator){
        item.remove_child(item._indicator);
        item.insert_child_at_index(item._indicator, 0);
        item._indicator.x_align = Clutter.ActorAlign.CENTER;
        item._indicator.y_align = Clutter.ActorAlign.START;
        item._indicator.y_expand = false;
    }

    const iconSizeEnum = settings.get_enum('menu-item-grid-icon-size');
    let defaultIconStyle = layoutProperties.DefaultIconGridStyle;

    iconSize = getGridIconStyle(iconSizeEnum, defaultIconStyle);
    item.name = iconSize;
}

function getIconSize(iconSizeEnum, defaultIconSize){
    const IconSizeEnum = iconSizeEnum;
    let iconSize = defaultIconSize;

    if(IconSizeEnum === Constants.IconSize.DEFAULT)
        iconSize = defaultIconSize;
    else if(IconSizeEnum === Constants.IconSize.EXTRA_SMALL)
        iconSize = Constants.EXTRA_SMALL_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.SMALL)
        iconSize = Constants.SMALL_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.MEDIUM)
        iconSize = Constants.MEDIUM_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.LARGE)
        iconSize = Constants.LARGE_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.EXTRA_LARGE)
        iconSize = Constants.EXTRA_LARGE_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.HIDDEN)
        iconSize = Constants.ICON_HIDDEN;

    return iconSize;
}

function getGridIconSize(iconSizeEnum, defaultIconStyle){
    let iconSize;
    if(iconSizeEnum === Constants.GridIconSize.DEFAULT){
        Constants.GridIconInfo.forEach((info) => {
            if(info.NAME === defaultIconStyle){
                iconSize = info.ICON_SIZE;
            }
        });
    }
    else
        iconSize = Constants.GridIconInfo[iconSizeEnum - 1].ICON_SIZE;

    return iconSize;
}

function getGridIconStyle(iconSizeEnum, defaultIconStyle){
    const IconSizeEnum = iconSizeEnum;
    let iconStyle = defaultIconStyle;
    if(IconSizeEnum === Constants.GridIconSize.DEFAULT)
        iconStyle = defaultIconStyle;
    else if(IconSizeEnum === Constants.GridIconSize.SMALL)
        iconStyle = 'SmallIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.MEDIUM)
        iconStyle = 'MediumIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.LARGE)
        iconStyle = 'LargeIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.SMALL_RECT)
        iconStyle = 'SmallRectIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.MEDIUM_RECT)
        iconStyle = 'MediumRectIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.LARGE_RECT)
        iconStyle = 'LargeRectIconGrid';

    return iconStyle;
}

function getCategoryDetails(currentCategory){
    let name, gicon, fallbackIcon = null;

    for(let entry of Constants.Categories){
        if(entry.CATEGORY === currentCategory){
            name = entry.NAME;
            gicon = Gio.icon_new_for_string(entry.ICON);
            return [name, gicon, fallbackIcon];
        }
    }

    if(currentCategory === Constants.CategoryType.HOME_SCREEN){
        name = _("Home");
        gicon = Gio.icon_new_for_string('go-home-symbolic');
        return [name, gicon, fallbackIcon];
    }
    else{
        name = currentCategory.get_name();

        if(!currentCategory.get_icon()){
            gicon = null;
            fallbackIcon = Gio.icon_new_for_string(Me.path + '/media/icons/menu_icons/category_icons/applications-other-symbolic.svg');
            return [name, gicon, fallbackIcon];
        }

        gicon = currentCategory.get_icon();

        let iconString = currentCategory.get_icon().to_string() + '-symbolic.svg';
        fallbackIcon = Gio.icon_new_for_string(Me.path + '/media/icons/menu_icons/category_icons/' + iconString);

        return [name, gicon, fallbackIcon];
    }
}

function activateCategory(currentCategory, menuLayout, menuItem, extraParams = false){
    if(currentCategory === Constants.CategoryType.HOME_SCREEN){
        menuLayout.activeCategory = _("Pinned Apps");
        menuLayout.displayPinnedApps();
    }
    else if(currentCategory === Constants.CategoryType.PINNED_APPS)
        menuLayout.displayPinnedApps();
    else if(currentCategory === Constants.CategoryType.FREQUENT_APPS){
        menuLayout.setFrequentAppsList(menuItem);
        menuLayout.displayCategoryAppList(menuItem.appList, currentCategory, extraParams ? menuItem : null);
    }
    else if(currentCategory === Constants.CategoryType.ALL_PROGRAMS)
        menuLayout.displayCategoryAppList(menuItem.appList, currentCategory, extraParams ? menuItem : null);
    else if(currentCategory === Constants.CategoryType.RECENT_FILES)
        menuLayout.displayRecentFiles();
    else
        menuLayout.displayCategoryAppList(menuItem.appList, currentCategory, extraParams ? menuItem : null);

    menuLayout.activeCategoryType = currentCategory;
}

function getMenuButtonIcon(settings, path){
    let iconType = settings.get_enum('menu-button-icon');

    if(iconType === Constants.MenuIcon.CUSTOM){
        if(path && GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;
    }
    else if(iconType === Constants.MenuIcon.DISTRO_ICON){
        let iconEnum = settings.get_int('distro-icon');
        path = Me.path + Constants.DistroIcons[iconEnum].PATH;
        if(Constants.DistroIcons[iconEnum].PATH === 'start-here-symbolic')
            return 'start-here-symbolic';
        else if(GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;
    }
    else{
        let iconEnum = settings.get_int('arc-menu-icon');
        path = Me.path + Constants.MenuIcons[iconEnum].PATH;
        if(GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;
    }

    global.log("ArcMenu Error - Failed to set menu button icon. Set to System Default.");
    return 'start-here-symbolic';
}

function findSoftwareManager(){
    let softwareManager = null;
    let appSys = imports.gi.Shell.AppSystem.get_default();

    for(let softwareManagerID of Constants.SoftwareManagerIDs){
        if(appSys.lookup_app(softwareManagerID)){
            softwareManager = softwareManagerID;
            break;
        }
    }

    return softwareManager;
}

function areaOfTriangle(p1, p2, p3){
    return Math.abs((p1[0] * (p2[1] - p3[1]) + p2[0] * (p3[1] - p1[1]) + p3[0] * (p1[1] - p2[1])) / 2.0);
}

function ensureActorVisibleInScrollView(actor) {
    let box = actor.get_allocation_box();
    let y1 = box.y1, y2 = box.y2;

    let parent = actor.get_parent();
    while (!(parent instanceof imports.gi.St.ScrollView)) {
        if (!parent)
            return;

        box = parent.get_allocation_box();
        y1 += box.y1;
        y2 += box.y1;
        parent = parent.get_parent();
    }

    let adjustment = parent.vscroll.adjustment;
    let [value, lower_, upper, stepIncrement_, pageIncrement_, pageSize] = adjustment.get_values();

    let offset = 0;
    let vfade = parent.get_effect("fade");
    if (vfade)
        offset = vfade.fade_margins.top;

    if (y1 < value + offset)
        value = Math.max(0, y1 - offset);
    else if (y2 > value + pageSize - offset)
        value = Math.min(upper, y2 + offset - pageSize);
    else
        return;
    adjustment.set_value(value);
}

function getDashToPanelPosition(settings, index){
    var positions = null;
    var side = 'NONE';

    try{
        positions = JSON.parse(settings.get_string('panel-positions'));
        side = positions[index];
    } catch(e){
        log('Error parsing Dash to Panel positions: ' + e.message);
    }

    if (side === 'TOP')
        return imports.gi.St.Side.TOP;
    else if (side === 'RIGHT')
        return imports.gi.St.Side.RIGHT;
    else if (side === 'BOTTOM')
        return imports.gi.St.Side.BOTTOM;
    else if (side === 'LEFT')
        return imports.gi.St.Side.LEFT;
    else
        return imports.gi.St.Side.BOTTOM;
}

function checkIfValidShortcut(item, icon){
    if(item._cmd.endsWith(".desktop") && !Gio.DesktopAppInfo.new(item._cmd)){
        icon.icon_name = 'warning-symbolic';
        item.title = "<b><i>" + _("Invalid Shortcut") + "</i></b> "+ _(item.title);
    }
}

function parseRGBA(colorString){
    let rgba = new imports.gi.Gdk.RGBA();
    rgba.parse(colorString);
    return rgba;
}

function createXpmImage(color1, color2, color3, color4){
    color1 = rgbToHex(parseRGBA(color1));
    color2 = rgbToHex(parseRGBA(color2));
    color3 = rgbToHex(parseRGBA(color3));
    color4 = rgbToHex(parseRGBA(color4));
    let width = 42;
    let height = 14;
    let nColors = 5;

    let xpmData = [`${width} ${height} ${nColors} 1`, `1 c ${color1}`, `2 c ${color2}`,
                    `3 c ${color3}`, `4 c ${color4}`, `x c #AAAAAA`]

    xpmData.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

    for(let i = 0; i < height - 2; i++)
        xpmData.push("x1111111111222222222233333333334444444444x");

    xpmData.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

    return xpmData;
}

function rgbToHex(color) {
    let [r, g, b, a_] = [Math.round(color.red * 255), Math.round(color.green * 255), Math.round(color.blue * 255), Math.round(color.alpha * 255)];
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getIconPath(listing){
    let path, icon;
    const shortcutCommand = listing[2];
    const shortcutIconName = listing[1];

    if(shortcutCommand === "ArcMenu_Home")
        path = GLib.get_home_dir();
    else if(shortcutCommand.startsWith("ArcMenu_")){
        let string = shortcutCommand;
        path = string.replace("ArcMenu_",'');
        if(path === "Documents")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        else if(path === "Downloads")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD);
        else if(path === "Music")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_MUSIC);
        else if(path === "Pictures")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
        else if(path === "Videos")
            path = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS);
        else
            path = null;
    }
    else if(shortcutIconName === shortcutCommand)
        path = shortcutIconName;
    else if(shortcutIconName === "ArcMenu_Folder"){
        path = shortcutIconName;
    }
    else
        path = null;

    if(path){
        let file = Gio.File.new_for_path(path);
        try {
            let info = file.query_info('standard::symbolic-icon', 0, null);
            icon = info.get_symbolic_icon();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!file.is_native()) {
                    icon = new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    icon = new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }
        return icon.to_string();
    }
    else{
        if(shortcutCommand === "ArcMenu_Network")
            return 'network-workgroup-symbolic';
        else if(shortcutCommand === "ArcMenu_Computer")
            return 'drive-harddisk-symbolic';
        else
            return shortcutIconName;
    }
}
