import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
};

export function LoadingImage({ uri, style, resizeMode = 'cover' }: Props) {
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const loaded = loadedUri === uri;

  return (
    <View style={[styles.frame, style]}>
      <Image
        source={{ uri }}
        resizeMode={resizeMode}
        style={styles.image}
        onLoadEnd={() => setLoadedUri(uri)}
        onError={() => setLoadedUri(uri)}
      />
      {loaded ? null : (
        <View style={styles.overlay}>
          <ActivityIndicator color="#2F6B4F" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: '#E6E1D8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
