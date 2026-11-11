// constants/dimensions.ts — responsive scaling utilities

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
  } from 'react-native-responsive-screen'
  import { RFValue } from 'react-native-responsive-fontsize'
  
  export { wp, hp }
  export const rf = (size: number) => RFValue(size)
  