<p align="center">
  <img alt="Version" src="https://img.shields.io/github/release/KotRikD/tosu.svg?style=for-the-badge&color=%235686A2" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.14.2-45915E.svg?style=for-the-badge&logo=node.js&logoColor=white" />
  <a href="https://github.com/KotRikD/tosu/blob/master/LICENSE" target="_blank"><img alt="License: GPL--3.0" src="https://img.shields.io/github/license/KotRikD/tosu?style=for-the-badge&color=%23A27456" /></a>
  <a href="https://twitter.com/kotrik0" target="_blank"><img alt="Twitter: kotrik0" src="https://img.shields.io/badge/kotrik0-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" /></a>
</p>


<h1 align="center">Welcome to tosu 👋</h1>
<div align="center">
<img src=".github/logo.png" />
</div>

<br>


<br>

```text
Eponymous software for reading osu! memory, accounting for most of gosumemory's issues
```

<br>

<div  align="center">
<a href="https://github.com/KotRikD/tosu/releases/latest"><img src=".github/button-boosty.png" /></a><br>
<a href="https://github.com/KotRikD/tosu/releases/latest"><img src=".github/button-download.png" /></a>
<a href="https://discord.gg/WX7BTs8kwh"><img src=".github/button-discord.png" /></a>
<a href="https://github.com/cyperdark/osu-counters/tree/master/counters"><img src=".github/button-counters.png" /></a>
</div>


Instruction
---
1. Download [tosu](https://github.com/KotRikD/tosu/releases/latest)
2. Extract tosu.exe to a `Folder`
3. Run `tosu.exe`
4. Go to [http://127.0.0.1:24050](http://127.0.0.1:24050)
5. Now you in overlays dashboard, in here you can download counters, or tweek settings of tosu
6. Here you can watch showcase of dashboard: [link](https://youtu.be/3eW4TD_zwhM)
8. Have fun!
---

<br>

Features
---
- [x] All _**Gamemodes**_ are supported
- [x] Gosumemory _**compatible**_ api
- [X] Brand _**new api**_ for websocket
- [x] _**In-game**_ overlay (based on gosumemory closed overlay injection)
- [x] _**Available**_ websocket data:
  - Settings
  - Gameplay data
  - User ingame data
  - Beatmap data
  - Session _**(Work in progress)**_
  - Multiple graphs for different skill sets _**(aim, speed, etc)**_
    - Extended starrating stats _**(per mode)**_ 
  - Leaderboards list _**(array)**_
  - Folders paths and Files names
  - Direct paths to files
  - Result screen
  - Tourney data _**(not tested, yet)**_
- [X] LOW CPU USAGE (I actually checked, this thing has a much lower memory recoil than the gosu)
---

<br>

In-game overlay
---
- To enable it, you need to edit `tosu.env`, and turn on `ENABLE_GOSU_OVERLAY=true` (make it equal `true`)
---

<br>

Routes
---
gosu compatible api
- `/` - List of all counters you have
- `/json` - Example of `/ws` response
- `/ws` - [response example](https://github.com/KotRikD/tosu/wiki/v1-websocket-api-response)
- `/Songs/{path}` - Show content of the file, or show list of files for a folder

v2 _**(tosu own api)**_
- `/json/v2` - Example of `/websocket/v2` response
- `/websocket/v2` - [response example](https://github.com/KotRikD/tosu/wiki/v2-websocket-api-response)
- `/files/beatmap/{path}` - same as `/Songs/{path}`
- `/files/skin/{path}` - similar as `/files/beatmap/{path}`, but for a skin

api
- `/api/calculate/pp` - Calculate pp for beatmap with custom data
  - [Response example](https://github.com/KotRikD/tosu/wiki/api-calculate-pp-response-example)
  - BY DEFAULT IT USES CURRENT BEATMAP (:))
  - All parameters are optional
  - `path` - Path to .osu file. Example: C:/osu/Songs/beatmap/file.osu
  - `mode` - Osu = 0, Taiko = 1, Catch = 2, Mania = 3
  - `mods` - Mods id. Example: 64 - DT
  - `acc` - Accuracy % from 0 to 100
  - `nGeki` - Amount of Geki (300g / MAX)
  - `nKatu` - Amount of Katu (100k / 200)
  - `n300` - Amount of 300
  - `n100` - Amount of 100
  - `n50` - Amount of 50
  - `nMisses` - Amount of Misses
  - `combo` - combo
  - `passedObjects` - Sum of nGeki, nKatu, n300, n100, n50, nMisses
  - `clockRate` - Map rate number. Example: 1.5 = DT
---


<br />

Support
---
- Give a ⭐️ if this project helped you!
- If you need help setting up this program or have any suggestions/comissions, feel free to go to the [discord](https://discord.gg/WX7BTs8kwh) channel above in the `🔵 tosu` section
---

<br />

## Author
👤 **Mikhail Babynichev**
* Website: http://kotrik.ru
* Twitter: [@kotrik0](https://twitter.com/kotrik0)
* Github: [@KotRikD](https://github.com/KotRikD)

Special thanks to [@xxCherry](https://github.com/xxCherry), for providing memory reading library

<br />

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/KotRikD/tosu/issues). You can also take a look at the [contributing guide](https://github.com/KotRikD/tosu/blob/master/CONTRIBUTING.md).

<br />

## 📝 License

Copyright © 2023-2024 [Mikhail Babynichev](https://github.com/KotRikD).<br />
This project is [LGPL-3.0](https://github.com/KotRikD/tosu/blob/master/LICENSE) licensed.
