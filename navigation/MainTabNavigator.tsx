import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/home/HomeScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import CustomBottomTab from '../components/customBottomTab/CustomBottomTab';

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomBottomTab {...props} />}
      screenOptions={() => ({
        headerShown: false,
        tabBarShowLabel: true,
        // tabBarStyle: {
        //   display: 'none',
        // },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
