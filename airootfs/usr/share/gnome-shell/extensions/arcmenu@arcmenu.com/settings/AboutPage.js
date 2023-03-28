const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {Adw, GdkPixbuf, GLib, GObject, Gtk} = imports.gi;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

var AboutPage = GObject.registerClass(
class ArcMenu_AboutPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _("About"),
            icon_name: 'help-about-symbolic',
            name: 'AboutPage'
        });
        this._settings = settings;

        //ArcMenu Logo and project description-------------------------------------
        let arcMenuLogoGroup = new Adw.PreferencesGroup();
        let arcMenuImage = new Gtk.Image({
            margin_bottom: 5,
            icon_name: 'arc-menu-logo',
            pixel_size: 100,
        });
        let arcMenuImageBox = new Gtk.Box( {
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false
        });
        arcMenuImageBox.append(arcMenuImage);

        let arcMenuLabel = new Gtk.Label({
            label: '<span size="large"><b>' + _('ArcMenu') + '</b></span>',
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.FILL
        });

        let projectDescriptionLabel = new Gtk.Label({
            label: _('Application Menu Extension for GNOME'),
            hexpand: false,
            vexpand: false,
        });
        arcMenuImageBox.append(arcMenuLabel);
        arcMenuImageBox.append(projectDescriptionLabel);
        arcMenuLogoGroup.add(arcMenuImageBox);

        this.add(arcMenuLogoGroup);
        //-----------------------------------------------------------------------

        //Extension/OS Info Group------------------------------------------------
        let extensionInfoGroup = new Adw.PreferencesGroup();
        let arcMenuVersionRow = new Adw.ActionRow({
            title: _("ArcMenu Version"),
        });
        let releaseVersion;
        if(Me.metadata.version)
            releaseVersion = Me.metadata.version;
        else
            releaseVersion = 'unknown';
        arcMenuVersionRow.add_suffix(new Gtk.Label({
            label: releaseVersion + ''
        }));
        extensionInfoGroup.add(arcMenuVersionRow);

        let commitRow = new Adw.ActionRow({
            title: _('Git Commit')
        });
        let commitVersion;
        if(Me.metadata.commit)
            commitVersion = Me.metadata.commit;
        commitRow.add_suffix(new Gtk.Label({
            label: commitVersion ? commitVersion : '',
        }));
        if(commitVersion){
            extensionInfoGroup.add(commitRow);
        }

        let gnomeVersionRow = new Adw.ActionRow({
            title: _('GNOME Version'),
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: imports.misc.config.PACKAGE_VERSION + '',
        }));
        extensionInfoGroup.add(gnomeVersionRow);

        let osRow = new Adw.ActionRow({
            title: _('OS'),
        });
        let osInfoText;
        let name = GLib.get_os_info("NAME");
        let prettyName = GLib.get_os_info("PRETTY_NAME");
        if(prettyName)
            osInfoText = prettyName;
        else
            osInfoText = name;
        let versionID = GLib.get_os_info("VERSION_ID");
        if(versionID)
            osInfoText += "; Version ID: " + versionID;
        let buildID = GLib.get_os_info("BUILD_ID");
        if(buildID)
            osInfoText += "; " + "Build ID: " +buildID;
        osRow.add_suffix(new Gtk.Label({
            label: osInfoText,
            single_line_mode: false,
            wrap: true,
        }));
        extensionInfoGroup.add(osRow);

        let sessionTypeRow = new Adw.ActionRow({
            title: _('Session Type'),
        });
        let windowingLabel;
        if(Me.metadata.isWayland)
            windowingLabel = "Wayland";
        else
            windowingLabel = "X11";
        sessionTypeRow.add_suffix(new Gtk.Label({
            label: windowingLabel,
        }));
        extensionInfoGroup.add(sessionTypeRow);

        this.add(extensionInfoGroup);
        //-----------------------------------------------------------------------

        //CREDTIS----------------------------------------------------------------
        let creditsGroup = new Adw.PreferencesGroup({
            title: _("Credits")
        });
        this.add(creditsGroup);

        let creditsRow = new Adw.PreferencesRow({
            activatable: false,
            selectable: false
        });
        creditsGroup.add(creditsRow);

        let creditsBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
        });
        creditsRow.set_child(creditsBox);

        let creditsCarousel = new Adw.Carousel({
            hexpand: true,
            halign: Gtk.Align.FILL,
            margin_top: 5,
            margin_bottom: 5
        });
        let creditsCarouselDots = new Adw.CarouselIndicatorDots({
            carousel: creditsCarousel,
        });
        creditsCarousel.append(new Gtk.Label({
            label: Constants.DEVELOPERS,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER
        }));
        creditsCarousel.append(new Gtk.Label({
            label: Constants.CONTRIBUTORS,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER
        }));
        creditsCarousel.append(new Gtk.Label({
            label: Constants.ARTWORK,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER
        }));
        creditsBox.append(creditsCarousel);
        creditsBox.append(creditsCarouselDots);
        //-----------------------------------------------------------------------

        let linksGroup = new Adw.PreferencesGroup();
        let linksBox = new Adw.ActionRow();

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/media/icons/prefs_icons/donate-icon.svg', -1, 50, true);
        let donateImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        let donateLinkButton = new Gtk.LinkButton({
            child: donateImage,
            uri: 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=53CWA7NR743WC&item_name=Donate+to+support+my+work&currency_code=USD&source=url',
        });

        pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/media/icons/prefs_icons/gitlab-icon.svg', -1, 50, true);
        let gitlabImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        let projectUrl = Me.metadata.url;
        let projectLinkButton = new Gtk.LinkButton({
            child: gitlabImage,
            uri: projectUrl,
        });

        linksBox.add_prefix(projectLinkButton);
        linksBox.add_suffix(donateLinkButton);
        linksGroup.add(linksBox);
        this.add(linksGroup);

        let gnuSoftwareGroup = new Adw.PreferencesGroup();
        let gnuSofwareLabel = new Gtk.Label({
            label: _(Constants.GNU_SOFTWARE),
            use_markup: true,
            justify: Gtk.Justification.CENTER
        });
        let gnuSofwareLabelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END,
            vexpand: true,
        });
        gnuSofwareLabelBox.append(gnuSofwareLabel);
        gnuSoftwareGroup.add(gnuSofwareLabelBox);
        this.add(gnuSoftwareGroup);
    }
});
    