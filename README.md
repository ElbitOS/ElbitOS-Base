# ElbitOS Base

![logo](gitlab_assets/logo-min.png)

ElbitOS Base is a basic live version of ElbitOS used for Development.

------

### Build

Install archiso (if not installed)

```bash
sudo pacman -S archiso
```

Clone the repository

```bash
git clone https://gitlab.com/ElbitOS/elbitos-base
```

Use archiso to create a bootable ISO

```bash
sudo archiso -v elbitos-base
```

Work and out directories should be created and the out directory will contain the ISO file
