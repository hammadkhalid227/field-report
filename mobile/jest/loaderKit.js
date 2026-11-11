const React = require('react');
const { View } = require('react-native');

function Loader(props) {
  return React.createElement(View, props);
}

module.exports = {
  LoaderKitView: Loader,
  LoaderKitProgress: Loader,
};
