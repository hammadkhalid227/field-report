module.exports = {
  __esModule: true,
  default: {
    fs: {
      dirs: { DocumentDir: '/documents' },
      exists: async () => false,
      readFile: async () => '',
      writeFile: async () => 0,
      mv: async () => {},
      cp: async () => {},
      unlink: async () => {},
      mkdir: async () => {},
      stat: async () => ({ size: 0 }),
    },
  },
};
