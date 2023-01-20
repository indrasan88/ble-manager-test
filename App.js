import React, {
  useState,
  useEffect,
} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Button,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
  TouchableOpacity,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';


import { stringToBytes, convertString } from "convert-string";
var Buffer = require('buffer/').Buffer  

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const peripherals = new Map();
  const [list, setList] = useState([]);


  const startScan = () => {
    if (!isScanning) {
      BleManager.scan([], 3, true).then((results) => {
        console.log('Scanning...');
        setIsScanning(true);
      }).catch(err => {
        console.error(err);
      });
    }    
  }

  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
  }

  const handleDisconnectedPeripheral = (data) => {
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      setList(Array.from(peripherals.values()));
    }
    console.log('Disconnected from ' + data.peripheral);
  }

  const handleUpdateValueForCharacteristic = (data) => {
    console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
  }

  const retrieveConnected = () => {
    BleManager.getConnectedPeripherals([]).then((results) => {
      if (results.length == 0) {
        console.log('No connected peripherals')
      }
      console.log(results);
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        console.log(i, peripheral.advertising.manufacturerData)
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        setList(Array.from(peripherals.values()));
      }
    });
  }

  const handleDiscoverPeripheral = (peripheral) => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    peripherals.set(peripheral.id, peripheral);
    setList(Array.from(peripherals.values()));
  }

  const testPeripheral = (peripheral) => {
    if (peripheral){
      if (peripheral.connected){
        BleManager.disconnect(peripheral.id);
      }else{
        BleManager.connect(peripheral.id).then(() => {
          let p = peripherals.get(peripheral.id);
          if (p) {
            p.connected = true;
            peripherals.set(peripheral.id, p);
            setList(Array.from(peripherals.values()));
          }
          console.log('Connected to ' + peripheral.id);


          setTimeout(() => {

            /* Test read current RSSI value */
            BleManager.retrieveServices(peripheral.id).then((peripheralData) => {
              console.log('Retrieved peripheral services', peripheralData);

              BleManager.readRSSI(peripheral.id).then((rssi) => {
                console.log('Retrieved actual RSSI value', rssi);
                let p = peripherals.get(peripheral.id);
                if (p) {
                  p.rssi = rssi;
                  peripherals.set(peripheral.id, p);
                  setList(Array.from(peripherals.values()));
                }                
              });                                          
            });

            // Test using bleno's pizza example
            // https://github.com/sandeepmistry/bleno/tree/master/examples/pizza
            
            BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
              console.log(peripheralInfo);
              var service = '0000ffff-0000-1000-8000-00805f9b34fb';
              var crustCharacteristic = '0000ff01-0000-1000-8000-00805f9b34fb';
              var bakeCharacteristic = '0000ff03-0000-1000-8000-00805f9b34fb';
              setTimeout(() => {
                BleManager.startNotification(peripheral.id, service, bakeCharacteristic).then(() => {
                  console.log('Started notification on ' + peripheral.id);
                  setTimeout(() => {
                    BleManager.write(peripheral.id, service, crustCharacteristic, [0]).then(() => {
                      console.log('Writed NORMAL crust');
                      BleManager.write(peripheral.id, service, bakeCharacteristic, [1,95]).then(() => {
                        console.log('Writed 351 temperature, the pizza should be BAKED');
                        
                        //var PizzaBakeResult = {
                        //  HALF_BAKED: 0,
                        //  BAKED:      1,
                        //  CRISPY:     2,
                        //  BURNT:      3,
                        //  ON_FIRE:    4
                        //};
                      });
                    });
                  }, 500);
                }).catch((error) => {
                  console.log('Notification error', error);
                });
              }, 200);
            });

            

          }, 900);
        }).catch((error) => {
          console.log('Connection error', error);
        });
      }
    }

  }

  const scanAndConnect = async() => {
    BleManager.writeWithoutResponse(
                        "02:11:23:34:56:63",
                        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
                        'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
                        ['AgEKAgoEAwLw/xEG8sPwrqn6FYydSa5zcQqB5w0JUHJpbnRlcl9DOUY1AAAAAAAAAAAAAAAAAAAAAAAAAAA=']
                        )
                        .then((characteristic) => {
                            console.log('print value', characteristic.value)
                            // this.info(characteristic.value);
                            // this.manager.cancelDeviceConnection(device.id).then( () => {
                            //     this.manager.destroy()
                            // });
                        }).catch(err => console.log(err))
               
        
    };


  const print = async(text,SERVICE_UUID,CHAR_UUID) => {
    await this.scanAndConnect().then(async (res) => {
            for (let item of text) {
                let encryptedCredentials = new Buffer(item).toString("base64");

                promises.push(res.Device.writeCharacteristicWithResponseForService(
                    SERVICE_UUID, CHAR_UUID, encryptedCredentials));
            }
            await Promise.all(promises).then(() => {
                this.manager.destroy()
            })
        }).catch(err => {return});
}

  useEffect(() => {
    BleManager.start({showAlert: false});

    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan );
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
          if (result) {
            console.log("Permission is OK");
          } else {
            PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
              if (result) {
                console.log("User accept");
              } else {
                console.log("User refuse");
              }
            });
          }
      });
    }  
    
    return (() => {
      console.log('unmount');
      bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
      bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan );
      bleManagerEmitter.removeListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
      bleManagerEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );
    })
  }, []);

  const renderItem = (item) => {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => testPeripheral(item) }>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
          <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          {global.HermesInternal == null ? null : (
            <View style={styles.engine}>
              <Text style={styles.footer}>Engine: Hermes</Text>
            </View>
          )}
          <View style={styles.body}>
            
            <View style={{margin: 10}}>
              <Button 
                title={'Scan Bluetooth (' + (isScanning ? 'on' : 'off') + ')'}
                onPress={() => startScan() } 
              />            
            </View>

            <View style={{margin: 10}}>
              <Button title="Retrieve connected peripherals" onPress={() => retrieveConnected() } />
            </View>

            {(list.length == 0) &&
              <View style={{flex:1, margin: 20}}>
                <Text style={{textAlign: 'center'}}>No peripherals</Text>
              </View>
            }
          
          </View>              
        </ScrollView>
        <FlatList
            data={list}
            renderItem={({ item }) => renderItem(item) }
            keyExtractor={item => item.id}
          />   

          <TouchableOpacity style={{ marginTop:20}} onPress={async ()=> {
            // await BleManager.retrieveServices("02:11:23:34:56:63").then(
            //   (peripheralInfo) => {
            //     // Success code
            //     console.log("Peripheral info:", peripheralInfo);
            //   }
            // );

            BleManager.retrieveServices("02:11:23:34:56:63").then((peripheralInfo) => {
              console.log('perip', peripheralInfo.advertising);
              var perp = '02:11:23:34:56:63';
              var service = '0000fff0-0000-1000-8000-00805f9b34fb';
              var writeUuid = '0000fff2-0000-1000-8000-00805f9b34fb';
              var notifUuid = '0000fff1-0000-1000-8000-00805f9b34fb';
              setTimeout(() => {
                BleManager.startNotification("02:11:23:34:56:63", service, notifUuid, 1).then(() => {
                  console.log('Started notification on ' + "02:11:23:34:56:63");

                  const resp =  BleManager.write("02:11:23:34:56:63", service, writeUuid, [1]).then((response) => {
                    console.log('Writed2 ' + response);
                   
                  });


                  setTimeout(async () => {

                  
                    BleManager.read(
                      "02:11:23:34:56:63",
                      '180a',
                      '2a26'
                    )
                      .then((readData) => {
                        // Success code
                        console.log("Read: " + readData);
                    
                        const buffer = Buffer.from(readData); //https://github.com/feross/buffer#convert-arraybuffer-to-buffer
                        const sensorData = buffer.readUInt8(1, true);
                        console.log('sensorData ' + sensorData)
                      })
                      .catch((error) => {
                        // Failure code
                        console.log(error);
                      });

                      

                    BleManager.writeWithoutResponse("02:11:23:34:56:63", service, writeUuid, stringToBytes('yourStringDatayourStringDatayourStringDatayourStringDatayourStringDatayourStringDatayourStringDatayourStringDatayourStringDatayourStringData')).then(() => {
                      console.log('Writed NORMAL crust');


                      let command = new Array(255);
                      console.log('str to byte:',stringToBytes('5334'))
                      command.fill(0);
                      command[255] = 515;
                      command[2] = 1;
                      

                      const resp =  BleManager.write("02:11:23:34:56:63", service, writeUuid, command).then((response) => {
                        console.log('Writed ' + response);
                        

                        BleManager.read(
                          "02:11:23:34:56:63",
                          service,
                          notifUuid
                        )
                          .then((readData) => {
                            // Success code
                            console.log("Read: " + readData);
                        
                            const buffer = Buffer.Buffer.from(readData); //https://github.com/feross/buffer#convert-arraybuffer-to-buffer
                            const sensorData = buffer.readUInt8(1, true);
                          })
                          .catch((error) => {
                            // Failure code
                            console.log(error);
                          });
                        
                        //var PizzaBakeResult = {
                        //  HALF_BAKED: 0,
                        //  BAKED:      1,
                        //  CRISPY:     2,
                        //  BURNT:      3,
                        //  ON_FIRE:    4
                        //};
                      });

                        
                    });
                  }, 500);

                  
                }).catch((error) => {
                  console.log('Notification error', error);
                });
              }, 200);

              
            })

          }}>
          <Text>Print</Text>  
          </TouchableOpacity>

          <TouchableOpacity onPress={async ()=> {
            // await BleManager.retrieveServices("02:11:23:34:56:63").then(
            //   (peripheralInfo) => {
            //     // Success code
            //     console.log("Peripheral info:", peripheralInfo);
            //   }
            // );

            BleManager.retrieveServices("DC:0D:30:7A:C9:F5").then((peripheralInfo) => {
              console.log('perip', peripheralInfo);
              var service = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
              // var crustCharacteristic = '0000ff01-0000-1000-8000-00805f9b34fb';
              var bakeCharacteristic = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f';
              setTimeout(() => {
                BleManager.startNotification("DC:0D:30:7A:C9:F5", service, bakeCharacteristic).then(() => {
                  console.log('Started notification on ' + "DC:0D:30:7A:C9:F5");
                  setTimeout(() => {
                    BleManager.writeWithoutResponse("DC:0D:30:7A:C9:F5", service, bakeCharacteristic, stringToBytes('yourStringData')).then(() => {
                      console.log('Writed NORMAL crusttt');
                    });


                    BleManager.write("DC:0D:30:7A:C9:F5", service, bakeCharacteristic, [0]).then(() => {
                      console.log('Writed NORMAL crust');
                      BleManager.write("DC:0D:30:7A:C9:F5", service, bakeCharacteristic, [1,95]).then(() => {
                        console.log('Writed 351 temperature, the pizza should be BAKED');
                        
                        //var PizzaBakeResult = {
                        //  HALF_BAKED: 0,
                        //  BAKED:      1,
                        //  CRISPY:     2,
                        //  BURNT:      3,
                        //  ON_FIRE:    4
                        //};
                      });
                    });
                  }, 500);
                }).catch((error) => {
                  console.log('Notification error', error);
                });
              }, 200);
            })

          }}>
          <Text>Print thermal</Text>  
          </TouchableOpacity>      

          <TouchableOpacity onPress={() => scanAndConnect() }><Text>Print 2</Text></TouchableOpacity>       

          
          <TouchableOpacity onPress={() => {
            var service = '0000ffff-0000-1000-8000-00805f9b34fb';
            var crustCharacteristic = '0000ff01-0000-1000-8000-00805f9b34fb';
            var bakeCharacteristic = '0000ff03-0000-1000-8000-00805f9b34fb';

            BleManager.retrieveServices("02:11:23:34:56:63").then((peripheralInfo) => {

              BleManager.read(
                "02:11:23:34:56:63",
                service,
                bakeCharacteristic
              )
                .then((readData) => {
                  // Success code
                  console.log("Read: " + readData);
              
                  const buffer = Buffer.Buffer.from(readData); //https://github.com/feross/buffer#convert-arraybuffer-to-buffer
                  const sensorData = buffer.readUInt8(1, true);
                })
                .catch((error) => {
                  // Failure code
                  console.log(error);
                });
            });
          } }><Text>Read 2</Text></TouchableOpacity>    
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;