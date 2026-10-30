import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron'

// Befehle, die das App-Menü an den Renderer schickt (Kanal 'menu:command'); der Renderer führt dieselben Store-Aktionen aus wie die Buttons.
export type MenuCommand =
  | 'save'
  | 'apply'
  | 'new-profile'
  | 'duplicate-profile'
  | 'settings'
  | 'section:lighting'
  | 'section:performance'
  | 'section:buttons'
  | 'section:macros'

const STRINGS = {
  de: {
    about: 'Über Naga Trinity Control',
    settings: 'Einstellungen …',
    file: 'Ablage',
    newProfile: 'Neues Profil',
    duplicate: 'Profil duplizieren',
    save: 'Speichern',
    apply: 'An Maus senden',
    close: 'Fenster schließen',
    view: 'Darstellung',
    lighting: 'Beleuchtung',
    performance: 'Performance',
    buttons: 'Tasten',
    macros: 'Makros',
    help: 'Hilfe',
    project: 'Projekt auf GitHub',
    services: 'Dienste',
    hide: 'Naga Trinity Control ausblenden',
    hideOthers: 'Andere ausblenden',
    unhide: 'Alle einblenden',
    quit: 'Naga Trinity Control beenden',
    edit: 'Bearbeiten',
    undo: 'Widerrufen',
    redo: 'Wiederholen',
    cut: 'Ausschneiden',
    copy: 'Kopieren',
    paste: 'Einsetzen',
    selectAll: 'Alles auswählen',
    fullscreen: 'Vollbildmodus',
    window: 'Fenster',
    minimize: 'Im Dock ablegen',
    zoom: 'Zoomen',
    front: 'Alle nach vorne bringen',
  },
  en: {
    about: 'About Naga Trinity Control',
    settings: 'Settings …',
    file: 'File',
    newProfile: 'New Profile',
    duplicate: 'Duplicate Profile',
    save: 'Save',
    apply: 'Send to Mouse',
    close: 'Close Window',
    view: 'View',
    lighting: 'Lighting',
    performance: 'Performance',
    buttons: 'Keys',
    macros: 'Macros',
    help: 'Help',
    project: 'Project on GitHub',
    services: 'Services',
    hide: 'Hide Naga Trinity Control',
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: 'Quit Naga Trinity Control',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    fullscreen: 'Enter Full Screen',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
  },
} as const

const PROJECT_URL = 'https://github.com/cepheiden/Razer-Naga-Trinity-MACOS'

export const buildAppMenu = (
  lang: 'de' | 'en',
  send: (command: MenuCommand) => void,
  isDev: boolean,
): Menu => {
  const s = STRINGS[lang]
  const item = (label: string, accelerator: string, command: MenuCommand): MenuItemConstructorOptions => ({
    label,
    accelerator,
    click: () => send(command),
  })

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: s.about },
        { type: 'separator' },
        item(s.settings, 'CmdOrCtrl+,', 'settings'),
        { type: 'separator' },
        { role: 'services', label: s.services },
        { type: 'separator' },
        { role: 'hide', label: s.hide },
        { role: 'hideOthers', label: s.hideOthers },
        { role: 'unhide', label: s.unhide },
        { type: 'separator' },
        { role: 'quit', label: s.quit },
      ],
    },
    {
      label: s.file,
      submenu: [
        item(s.newProfile, 'CmdOrCtrl+N', 'new-profile'),
        item(s.duplicate, 'CmdOrCtrl+D', 'duplicate-profile'),
        { type: 'separator' },
        item(s.save, 'CmdOrCtrl+S', 'save'),
        item(s.apply, 'CmdOrCtrl+Return', 'apply'),
        { type: 'separator' },
        { role: 'close', label: s.close },
      ],
    },
    // Ohne Bearbeiten-Menü funktionieren ⌘C/⌘V/⌘A in Textfeldern auf macOS nicht.
    {
      label: s.edit,
      submenu: [
        { role: 'undo', label: s.undo },
        { role: 'redo', label: s.redo },
        { type: 'separator' },
        { role: 'cut', label: s.cut },
        { role: 'copy', label: s.copy },
        { role: 'paste', label: s.paste },
        { role: 'selectAll', label: s.selectAll },
      ],
    },
    {
      label: s.view,
      submenu: [
        item(s.lighting, 'CmdOrCtrl+1', 'section:lighting'),
        item(s.performance, 'CmdOrCtrl+2', 'section:performance'),
        item(s.buttons, 'CmdOrCtrl+3', 'section:buttons'),
        item(s.macros, 'CmdOrCtrl+4', 'section:macros'),
        { type: 'separator' },
        ...(isDev ? ([{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }] as const) : []),
        { role: 'togglefullscreen', label: s.fullscreen },
      ],
    },
    {
      role: 'window',
      label: s.window,
      submenu: [
        { role: 'minimize', label: s.minimize },
        { role: 'zoom', label: s.zoom },
        { type: 'separator' },
        { role: 'front', label: s.front },
      ],
    },
    {
      role: 'help',
      label: s.help,
      submenu: [{ label: s.project, click: () => void shell.openExternal(PROJECT_URL) }],
    },
  ]

  return Menu.buildFromTemplate(template)
}
