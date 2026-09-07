import React, { useState, useEffect } from "react";

import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  useWindowDimensions,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

import { Ionicons } from "@expo/vector-icons";

import { useFonts } from "expo-font";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";
import { usePsgcAddress } from "../hooks/usePsgcAddress";

import pmgLogo from "../assets/images/pmg-logo-nav.png";


/*
============================================================
RESPONSIVE SCALE
============================================================
*/

const getScale = (width) => {
  if (width <= 360) {
    return 0.88;
  }

  if (width <= 430) {
    return 0.95;
  }

  if (width <= 600) {
    return 1;
  }

  return 1.08;
};


/*
============================================================
SELECT MODAL
============================================================
*/

const SelectModal = ({
  visible,
  title,
  data,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>

          {/* MODAL HEADER */}

          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>
                PRINT HUB
              </Text>

              <Text style={styles.modalTitle}>
                {title}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close"
                size={23}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* GREEN LINE */}

          <View style={styles.modalAccentLine}>
            <View
              style={[
                styles.modalAccentPart,
                {
                  backgroundColor:
                    COLORS.primary,
                },
              ]}
            />

            <View
              style={[
                styles.modalAccentPart,
                {
                  backgroundColor:
                    COLORS.primary,
                  opacity: 0.35,
                },
              ]}
            />
          </View>

          {/* OPTIONS */}

          <FlatList
            data={data || []}
            keyExtractor={(item) =>
              String(
                item?.code ||
                  item?.name
              )
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyModal}>
                <Ionicons
                  name="information-circle-outline"
                  size={28}
                  color={COLORS.textMuted}
                />

                <Text style={styles.emptyModalText}>
                  No options available.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalItemIcon}>
                  <Ionicons
                    name="location-outline"
                    size={17}
                    color={COLORS.primary}
                  />
                </View>

                <Text
                  style={styles.modalItemText}
                >
                  {item.name}
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};


/*
============================================================
EDIT PROFILE SCREEN
============================================================
*/

export default function EditProfileScreen({
  navigation,
}) {
  const { width } =
    useWindowDimensions();

  const scale =
    getScale(width);

  /*
  ==========================================================
  FONTS
  ==========================================================
  */

  const [fontsLoaded] =
    useFonts({
      Poppins_400Regular,
      Poppins_500Medium,
      Poppins_600SemiBold,
      Poppins_700Bold,
    });


  /*
  ==========================================================
  STATE
  ==========================================================
  */

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  /*
  ==========================================================
  FORM
  ==========================================================
  */

  const [form, setForm] =
    useState({
      name: "",
      birthday: "",
      gender: "",
      phone: "+63",
      street: "",
      region: "",
      province: "",
      city: "",
      barangay: "",
      avatar_url: "",
    });


  /*
  ==========================================================
  AVATAR
  ==========================================================
  */

  const [avatarUploading, setAvatarUploading] =
    useState(false);


  /*
  ==========================================================
  PSGC
  ==========================================================
  */

  const psgc =
    usePsgcAddress();


  /*
  ==========================================================
  ACTIVE MODAL
  ==========================================================
  */

  const [activeModal, setActiveModal] =
    useState(null);


  /*
  ==========================================================
  LOAD PROFILE
  ==========================================================
  */

  useEffect(() => {
    const loadData =
      async () => {
        try {
          const stored =
            await AsyncStorage.getItem(
              "user"
            );

          if (!stored) {
            navigation.goBack();
            return;
          }

          const parsed =
            JSON.parse(stored);

          setUser(parsed);

          const res =
            await fetch(
              `${API_BASE_URL}/api/user-profile/${parsed.id}`
            );

          const data =
            await res.json();

          if (res.ok) {
            const loadedAddress =
              data.address || "";

            const parts =
              loadedAddress
                .split(",")
                .map((s) =>
                  s.trim()
                );

            let region = "";
            let province = "";
            let city = "";
            let barangay = "";
            let street = "";

            if (parts.length >= 4) {
              region =
                parts[
                  parts.length - 1
                ] || "";

              province =
                parts[
                  parts.length - 2
                ] || "";

              city =
                parts[
                  parts.length - 3
                ] || "";

              barangay =
                parts[
                  parts.length - 4
                ] || "";

              if (
                barangay
                  .toLowerCase()
                  .startsWith(
                    "brgy."
                  )
              ) {
                barangay =
                  barangay
                    .substring(5)
                    .trim();
              }

              street =
                parts
                  .slice(
                    0,
                    parts.length - 4
                  )
                  .join(", ");
            } else {
              street =
                loadedAddress;
            }

            setForm({
              name:
                data.name ||
                parsed.firstName ||
                "",

              birthday:
                data.birthday ||
                "",

              gender:
                data.gender ||
                "",

              phone:
                data.phone ||
                "+63",

              street:
                street ||
                barangay,

              region,

              province,

              city,

              barangay,

              avatar_url:
                data.avatar_url ||
                "",
            });

            if (region) {
              await psgc.loadSavedAddressSequentially(
                region,
                province,
                city,
                barangay
              );
            }
          }
        } catch (err) {
          console.error(
            "[EditProfile] Load error:",
            err
          );

          Alert.alert(
            "Error",
            "Failed to load profile data."
          );
        } finally {
          setLoading(false);
        }
      };

    loadData();
  }, []);


  /*
  ==========================================================
  VALIDATION
  ==========================================================
  */

  const validate = () => {
    const name =
      String(
        form.name || ""
      ).trim();

    const phone =
      String(
        form.phone || ""
      ).trim();

    if (!name) {
      return "Name is required.";
    }

    const nameParts =
      name.split(/\s+/);

    if (nameParts.length < 2) {
      return "Please provide both first name and surname.";
    }

    if (
      !/^[A-Za-z.\-\s]+$/.test(
        name
      )
    ) {
      return "Name must not contain numbers or special characters.";
    }

    if (
      !/^\+63\d{10}$/.test(
        phone
      )
    ) {
      return "Phone number must be +63 followed by 10 digits.";
    }

    if (form.birthday) {
      const year =
        new Date(
          form.birthday
        ).getFullYear();

      if (year > 2011) {
        return "Only users born in 2011 or earlier are allowed.";
      }
    }

    if (
      !form.region ||
      !form.province ||
      !form.city ||
      !form.barangay ||
      !form.street
    ) {
      return "All address fields are required.";
    }

    return "";
  };


  /*
  ==========================================================
  SAVE PROFILE
  ==========================================================
  */

  const handleSave =
    async () => {
      const errorMsg =
        validate();

      if (errorMsg) {
        Alert.alert(
          "Validation Error",
          errorMsg
        );

        return;
      }

      setSaving(true);

      try {
        const addrParts = [
          form.street,

          form.barangay &&
            `Brgy. ${form.barangay}`,

          form.city,

          form.province &&
            form.province !==
              "N/A"
            ? form.province
            : "",

          form.region,
        ].filter(Boolean);

        const serializedAddress =
          addrParts.join(
            ", "
          );

        const payload = {
          name: form.name,

          birthday:
            form.birthday,

          gender:
            form.gender,

          phone:
            form.phone,

          address:
            serializedAddress,

          avatar_url:
            form.avatar_url,
        };

        const res =
          await fetch(
            `${API_BASE_URL}/api/user-profile/${user.id}`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                payload
              ),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              "Failed to update profile"
          );
        }

        const firstName =
          form.name.split(
            " "
          )[0];

        const updatedUser = {
          ...user,
          firstName,
        };

        await AsyncStorage.setItem(
          "user",
          JSON.stringify(
            updatedUser
          )
        );

        Alert.alert(
          "Profile Updated",
          "Your profile has been updated successfully.",
          [
            {
              text: "OK",
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } catch (err) {
        Alert.alert(
          "Error",
          err.message
        );
      } finally {
        setSaving(false);
      }
    };


  /*
  ==========================================================
  PICK AVATAR
  ==========================================================
  */

  const handlePickAvatar =
    async () => {
      try {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          status !== "granted"
        ) {
          Alert.alert(
            "Permission Required",
            "Sorry, we need camera roll permissions to make this work!"
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                "images",
              ],

              allowsEditing:
                true,

              aspect: [1, 1],

              quality: 0.8,
            }
          );

        if (
          !result.canceled &&
          result.assets?.[0]
        ) {
          await uploadAvatar(
            result.assets[0]
          );
        }
      } catch (err) {
        Alert.alert(
          "Error",
          err.message ||
            "Unable to select image."
        );
      }
    };


  /*
  ==========================================================
  UPLOAD AVATAR
  ==========================================================
  */

  const uploadAvatar =
    async (asset) => {
      setAvatarUploading(
        true
      );

      try {
        const formData =
          new FormData();

        formData.append(
          "file",
          {
            uri: asset.uri,

            name:
              asset.fileName ||
              "avatar.jpg",

            type:
              asset.mimeType ||
              "image/jpeg",
          }
        );

        const res =
          await fetch(
            `${API_BASE_URL}/api/user/avatar-upload`,
            {
              method: "POST",

              body: formData,

              headers: {
                "x-user-id":
                  String(
                    user.id
                  ),

                "Content-Type":
                  "multipart/form-data",
              },
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              "Upload failed"
          );
        }

        setForm(
          (previous) => ({
            ...previous,
            avatar_url:
              data.url,
          })
        );
      } catch (err) {
        Alert.alert(
          "Error",
          err.message ||
            "Failed to upload avatar"
        );
      } finally {
        setAvatarUploading(
          false
        );
      }
    };


  /*
  ==========================================================
  GENDER OPTIONS
  ==========================================================
  */

  const genderOptions = [
    {
      name: "Female",
    },

    {
      name: "Male",
    },

    {
      name: "Prefer not to say",
    },

    {
      name: "Other",
    },
  ];


  /*
  ==========================================================
  LOADING
  ==========================================================
  */

  if (
    loading ||
    !fontsLoaded
  ) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <View
          style={styles.loadingLogoBox}
        >
          <Image
            source={pmgLogo}
            style={
              styles.loadingLogo
            }
            resizeMode="contain"
          />
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={{
            marginTop: 15,
          }}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading profile...
        </Text>
      </View>
    );
  }


  /*
  ==========================================================
  MAIN UI
  ==========================================================
  */

  return (
    <View
      style={styles.container}
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View
        style={[
          styles.header,
          {
            paddingHorizontal:
              18 * scale,
          },
        ]}
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={28}
            color={
              COLORS.textPrimary
            }
          />
        </TouchableOpacity>

        <View
          style={
            styles.headerTitleContainer
          }
        >
          <Text
            style={[
              styles.headerTitle,
              {
                fontSize:
                  23 * scale,
              },
            ]}
          >
            Edit Profile
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                fontSize:
                  8.5 * scale,
              },
            ]}
          >
            PERSONAL INFORMATION
          </Text>
        </View>

        <View
          style={
            styles.headerLogoBox
          }
        >
          <Image
            source={pmgLogo}
            style={
              styles.headerLogo
            }
            resizeMode="contain"
          />
        </View>
      </View>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <ScrollView
        style={
          styles.scrollView
        }
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal:
              14 * scale,
            paddingBottom:
              45 * scale,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >

        {/* ==================================================
            PROFILE PHOTO CARD
        ================================================== */}

        <View
          style={[
            styles.card,
            styles.photoCard,
            {
              borderRadius:
                17 * scale,
              padding:
                18 * scale,
            },
          ]}
        >

          {/* Green top accent */}

          <View
            style={
              styles.cardTopAccent
            }
          >
            <View
              style={[
                styles.accentPart,
                {
                  backgroundColor:
                    COLORS.primary,
                },
              ]}
            />

            <View
              style={[
                styles.accentPart,
                {
                  backgroundColor:
                    COLORS.primary,
                  opacity: 0.35,
                },
              ]}
            />
          </View>


          <View
            style={
              styles.photoHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.cardEyebrow,
                  {
                    fontSize:
                      8.5 * scale,
                  },
                ]}
              >
                ACCOUNT
              </Text>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontSize:
                      17 * scale,
                  },
                ]}
              >
                Profile Picture
              </Text>
            </View>

            <View
              style={
                styles.photoHeaderIcon
              }
            >
              <Ionicons
                name="image-outline"
                size={19 * scale}
                color={
                  COLORS.primary
                }
              />
            </View>
          </View>


          {/* AVATAR */}

          <TouchableOpacity
            style={[
              styles.avatarContainer,
              {
                width:
                  112 * scale,
                height:
                  112 * scale,
                borderRadius:
                  56 * scale,
              },
            ]}
            onPress={
              handlePickAvatar
            }
            activeOpacity={0.85}
          >

            {form.avatar_url ? (
              <Image
                source={{
                  uri:
                    form.avatar_url,
                }}
                style={[
                  styles.avatarImage,
                  {
                    width:
                      112 * scale,
                    height:
                      112 * scale,
                    borderRadius:
                      56 * scale,
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  {
                    width:
                      112 * scale,
                    height:
                      112 * scale,
                    borderRadius:
                      56 * scale,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={45 * scale}
                  color={
                    COLORS.textMuted
                  }
                />
              </View>
            )}

            {avatarUploading && (
              <View
                style={[
                  styles.avatarOverlay,
                  {
                    borderRadius:
                      56 * scale,
                  },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.primary
                  }
                />
              </View>
            )}

            {/* CAMERA */}

            <View
              style={[
                styles.editBadge,
                {
                  width:
                    34 * scale,
                  height:
                    34 * scale,
                  borderRadius:
                    17 * scale,
                },
              ]}
            >
              <Ionicons
                name="camera"
                size={16 * scale}
                color={
                  COLORS.textDark
                }
              />
            </View>
          </TouchableOpacity>


          <Text
            style={[
              styles.avatarHint,
              {
                fontSize:
                  9.5 * scale,
              },
            ]}
          >
            Tap to change profile
            picture
          </Text>

        </View>


        {/* ==================================================
            PERSONAL INFORMATION
        ================================================== */}

        <View
          style={[
            styles.card,
            {
              borderRadius:
                17 * scale,
              padding:
                17 * scale,
            },
          ]}
        >

          <View
            style={
              styles.cardSectionHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.cardEyebrow,
                  {
                    fontSize:
                      8.5 * scale,
                  },
                ]}
              >
                PROFILE
              </Text>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontSize:
                      17 * scale,
                  },
                ]}
              >
                Personal Information
              </Text>
            </View>

            <View
              style={
                styles.greenIndicator
              }
            />
          </View>


          {/* =================================================
              FULL NAME
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Full Name
          </Text>

          <View
            style={
              styles.inputWrapper
            }
          >
            <Ionicons
              name="person-outline"
              size={18 * scale}
              color={
                COLORS.primary
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  fontSize:
                    11.5 * scale,
                },
              ]}
              value={form.name}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  name: text,
                })
              }
              placeholder="Enter your full name"
              placeholderTextColor={
                COLORS.textMuted
              }
              selectionColor={
                COLORS.primary
              }
            />
          </View>


          {/* =================================================
              BIRTHDAY
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Birthday
          </Text>

          <View
            style={
              styles.inputWrapper
            }
          >
            <Ionicons
              name="calendar-outline"
              size={18 * scale}
              color={
                COLORS.primary
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  fontSize:
                    11.5 * scale,
                },
              ]}
              value={
                form.birthday
              }
              onChangeText={(text) =>
                setForm({
                  ...form,
                  birthday: text,
                })
              }
              placeholder="YYYY-MM-DD"
              placeholderTextColor={
                COLORS.textMuted
              }
              selectionColor={
                COLORS.primary
              }
            />
          </View>


          {/* =================================================
              GENDER
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Gender
          </Text>

          <TouchableOpacity
            style={
              styles.selectBtn
            }
            onPress={() =>
              setActiveModal(
                "gender"
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={
                styles.selectLeft
              }
            >
              <Ionicons
                name="male-female-outline"
                size={18 * scale}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.selectText,
                  {
                    fontSize:
                      11.5 * scale,
                    color:
                      form.gender
                        ? COLORS.textPrimary
                        : COLORS.textMuted,
                  },
                ]}
              >
                {form.gender ||
                  "Select Gender..."}
              </Text>
            </View>

            <Ionicons
              name="chevron-down"
              size={19 * scale}
              color={
                COLORS.textMuted
              }
            />
          </TouchableOpacity>


          {/* =================================================
              PHONE
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Phone Number
          </Text>

          <View
            style={
              styles.inputWrapper
            }
          >
            <Ionicons
              name="call-outline"
              size={18 * scale}
              color={
                COLORS.primary
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  fontSize:
                    11.5 * scale,
                },
              ]}
              value={form.phone}
              onChangeText={(text) => {
                let val =
                  text.replace(
                    /[^0-9+]/g,
                    ""
                  );

                if (
                  !val.startsWith(
                    "+63"
                  )
                ) {
                  val = "+63";
                }

                if (
                  val.length > 13
                ) {
                  return;
                }

                setForm({
                  ...form,
                  phone: val,
                });
              }}
              keyboardType="phone-pad"
              placeholder="+639XXXXXXXXX"
              placeholderTextColor={
                COLORS.textMuted
              }
              selectionColor={
                COLORS.primary
              }
            />
          </View>

        </View>


        {/* ==================================================
            ADDRESS
        ================================================== */}

        <View
          style={[
            styles.card,
            {
              borderRadius:
                17 * scale,
              padding:
                17 * scale,
            },
          ]}
        >

          <View
            style={
              styles.cardSectionHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.cardEyebrow,
                  {
                    fontSize:
                      8.5 * scale,
                  },
                ]}
              >
                DELIVERY
              </Text>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontSize:
                      17 * scale,
                  },
                ]}
              >
                Address
              </Text>
            </View>

            <View
              style={
                styles.addressIcon
              }
            >
              <Ionicons
                name="location-outline"
                size={19 * scale}
                color={
                  COLORS.primary
                }
              />
            </View>
          </View>


          {/* =================================================
              REGION
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Region
          </Text>

          <TouchableOpacity
            style={
              styles.selectBtn
            }
            onPress={() =>
              setActiveModal(
                "region"
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={
                styles.selectLeft
              }
            >
              <Ionicons
                name="map-outline"
                size={18 * scale}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.selectText,
                  {
                    fontSize:
                      11.5 * scale,
                    color:
                      form.region
                        ? COLORS.textPrimary
                        : COLORS.textMuted,
                  },
                ]}
              >
                {form.region ||
                  "Select Region..."}
              </Text>
            </View>

            <Ionicons
              name="chevron-down"
              size={19 * scale}
              color={
                COLORS.textMuted
              }
            />
          </TouchableOpacity>


          {/* =================================================
              PROVINCE
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Province
          </Text>

          <TouchableOpacity
            style={[
              styles.selectBtn,
              (!form.region ||
                psgc.provinces
                  .length ===
                  0) &&
                styles.disabledSelect,
            ]}
            disabled={
              !form.region ||
              psgc.provinces
                .length === 0
            }
            onPress={() =>
              setActiveModal(
                "province"
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={
                styles.selectLeft
              }
            >
              <Ionicons
                name="business-outline"
                size={18 * scale}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.selectText,
                  {
                    fontSize:
                      11.5 * scale,
                    color:
                      form.province
                        ? COLORS.textPrimary
                        : COLORS.textMuted,
                  },
                ]}
              >
                {psgc.provinces
                  .length === 0
                  ? "N/A (No provinces)"
                  : form.province ||
                    "Select Province..."}
              </Text>
            </View>

            <Ionicons
              name="chevron-down"
              size={19 * scale}
              color={
                COLORS.textMuted
              }
            />
          </TouchableOpacity>


          {/* =================================================
              CITY
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            City / Municipality
          </Text>

          <TouchableOpacity
            style={[
              styles.selectBtn,
              !form.region &&
                styles.disabledSelect,
            ]}
            disabled={
              !form.region
            }
            onPress={() =>
              setActiveModal(
                "city"
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={
                styles.selectLeft
              }
            >
              <Ionicons
                name="navigate-outline"
                size={18 * scale}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.selectText,
                  {
                    fontSize:
                      11.5 * scale,
                    color:
                      form.city
                        ? COLORS.textPrimary
                        : COLORS.textMuted,
                  },
                ]}
              >
                {form.city ||
                  "Select City..."}
              </Text>
            </View>

            <Ionicons
              name="chevron-down"
              size={19 * scale}
              color={
                COLORS.textMuted
              }
            />
          </TouchableOpacity>


          {/* =================================================
              BARANGAY
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Barangay
          </Text>

          <TouchableOpacity
            style={[
              styles.selectBtn,
              !form.city &&
                styles.disabledSelect,
            ]}
            disabled={
              !form.city
            }
            onPress={() =>
              setActiveModal(
                "barangay"
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={
                styles.selectLeft
              }
            >
              <Ionicons
                name="home-outline"
                size={18 * scale}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.selectText,
                  {
                    fontSize:
                      11.5 * scale,
                    color:
                      form.barangay
                        ? COLORS.textPrimary
                        : COLORS.textMuted,
                  },
                ]}
              >
                {form.barangay ||
                  "Select Barangay..."}
              </Text>
            </View>

            <Ionicons
              name="chevron-down"
              size={19 * scale}
              color={
                COLORS.textMuted
              }
            />
          </TouchableOpacity>


          {/* =================================================
              STREET
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10.5 * scale,
              },
            ]}
          >
            Street Address
          </Text>

          <View
            style={[
              styles.inputWrapper,
              styles.streetInput,
            ]}
          >
            <Ionicons
              name="navigate-circle-outline"
              size={18 * scale}
              color={
                COLORS.primary
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  fontSize:
                    11.5 * scale,
                },
              ]}
              value={form.street}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  street: text,
                })
              }
              placeholder="House No., Street name, etc."
              placeholderTextColor={
                COLORS.textMuted
              }
              selectionColor={
                COLORS.primary
              }
            />
          </View>


          {/* =================================================
              ADDRESS PREVIEW
          ================================================= */}

          {(form.street ||
            form.barangay ||
            form.city ||
            form.province ||
            form.region) && (
            <View
              style={
                styles.addressPreview
              }
            >
              <View
                style={
                  styles.addressPreviewIcon
                }
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={
                  styles.addressPreviewContent
                }
              >
                <Text
                  style={
                    styles.addressPreviewLabel
                  }
                >
                  ADDRESS PREVIEW
                </Text>

                <Text
                  style={
                    styles.addressPreviewText
                  }
                >
                  {[
                    form.street,

                    form.barangay &&
                      `Brgy. ${form.barangay}`,

                    form.city,

                    form.province,

                    form.region,
                  ]
                    .filter(Boolean)
                    .join(
                      ", "
                    )}
                </Text>
              </View>
            </View>
          )}

        </View>


        {/* ==================================================
            SAVE BUTTON
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              minHeight:
                56 * scale,
              borderRadius:
                28 * scale,
            },
            saving &&
              styles.saveBtnDisabled,
          ]}
          onPress={
            handleSave
          }
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <>
              <ActivityIndicator
                color={
                  COLORS.textDark
                }
                size="small"
              />

              <Text
                style={[
                  styles.saveBtnText,
                  {
                    fontSize:
                      13 * scale,
                  },
                ]}
              >
                Saving...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={21 * scale}
                color={
                  COLORS.textDark
                }
              />

              <Text
                style={[
                  styles.saveBtnText,
                  {
                    fontSize:
                      13 * scale,
                  },
                ]}
              >
                Save Changes
              </Text>
            </>
          )}
        </TouchableOpacity>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <View
          style={
            styles.footer
          }
        >
          <Image
            source={pmgLogo}
            style={[
              styles.footerLogo,
              {
                width:
                  72 * scale,
                height:
                  32 * scale,
              },
            ]}
            resizeMode="contain"
          />

          <View
            style={
              styles.footerLine
            }
          />

          <Text
            style={[
              styles.footerText,
              {
                fontSize:
                  8 * scale,
              },
            ]}
          >
            PRINT • CREATE • DELIVER
          </Text>
        </View>

      </ScrollView>


      {/* ====================================================
          MODALS
      ==================================================== */}

      <SelectModal
        visible={
          activeModal ===
          "gender"
        }
        title="Select Gender"
        data={genderOptions}
        onClose={() =>
          setActiveModal(null)
        }
        onSelect={(val) =>
          setForm({
            ...form,
            gender: val,
          })
        }
      />

      <SelectModal
        visible={
          activeModal ===
          "region"
        }
        title="Select Region"
        data={psgc.regions}
        onClose={() =>
          setActiveModal(null)
        }
        onSelect={(val) =>
          psgc.handleRegionChange(
            val,
            (vals) =>
              setForm({
                ...form,
                ...vals,
              })
          )
        }
      />

      <SelectModal
        visible={
          activeModal ===
          "province"
        }
        title="Select Province"
        data={psgc.provinces}
        onClose={() =>
          setActiveModal(null)
        }
        onSelect={(val) =>
          psgc.handleProvinceChange(
            val,
            (vals) =>
              setForm({
                ...form,
                ...vals,
              })
          )
        }
      />

      <SelectModal
        visible={
          activeModal ===
          "city"
        }
        title="Select City"
        data={psgc.cities}
        onClose={() =>
          setActiveModal(null)
        }
        onSelect={(val) =>
          psgc.handleCityChange(
            val,
            (vals) =>
              setForm({
                ...form,
                ...vals,
              })
          )
        }
      />

      <SelectModal
        visible={
          activeModal ===
          "barangay"
        }
        title="Select Barangay"
        data={psgc.barangays}
        onClose={() =>
          setActiveModal(null)
        }
        onSelect={(val) =>
          setForm({
            ...form,
            barangay: val,
          })
        }
      />

    </View>
  );
}


/*
============================================================
STYLES
============================================================
*/

const styles =
  StyleSheet.create({

    /*
    ========================================================
    MAIN
    ========================================================
    */

    container: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    scrollView: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    scrollContent: {
      paddingTop: 15,
    },


    /*
    ========================================================
    LOADING
    ========================================================
    */

    loadingContainer: {
      flex: 1,

      alignItems: "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.background,
    },

    loadingLogoBox: {
      width: 68,

      height: 48,

      alignItems: "center",

      justifyContent:
        "center",

      marginBottom: 5,
    },

    loadingLogo: {
      width: "100%",

      height: "100%",
    },

    loadingText: {
      fontFamily:
        "Poppins_500Medium",

      fontSize: 11,

      color:
        COLORS.textMuted,

      marginTop: 8,
    },


    /*
    ========================================================
    HEADER
    ========================================================
    */

    header: {
      height: 86,

      backgroundColor:
        COLORS.surfaceDark,

      flexDirection: "row",

      alignItems: "center",

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,

      paddingTop: 12,
    },

    backButton: {
      width: 44,

      height: 44,

      alignItems: "center",

      justifyContent:
        "center",
    },

    headerTitleContainer: {
      flex: 1,

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: -4,
    },

    headerTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      letterSpacing: -0.5,
    },

    headerSubtitle: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.primary,

      letterSpacing: 1.2,

      marginTop: 1,
    },

    headerLogoBox: {
      width: 72,

      height: 38,

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: 5,
    },

    headerLogo: {
      width: "100%",

      height: "100%",
    },


    /*
    ========================================================
    GENERAL CARD
    ========================================================
    */

    card: {
      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      marginBottom: 15,

      overflow: "hidden",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 5,
      },

      shadowOpacity: 0.18,

      shadowRadius: 12,

      elevation: 3,
    },

    cardTopAccent: {
      position: "absolute",

      top: 0,

      left: 0,

      right: 0,

      height: 4,

      flexDirection: "row",
    },

    accentPart: {
      flex: 1,
    },


    /*
    ========================================================
    PHOTO CARD
    ========================================================
    */

    photoCard: {
      alignItems: "center",

      paddingTop: 22,
    },

    photoHeader: {
      width: "100%",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginBottom: 17,
    },

    photoHeaderIcon: {
      width: 39,

      height: 39,

      borderRadius: 20,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent:
        "center",
    },


    /*
    ========================================================
    CARD HEADERS
    ========================================================
    */

    cardSectionHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginBottom: 7,
    },

    cardEyebrow: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.primary,

      letterSpacing: 1.1,
    },

    cardTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      marginTop: 1,
    },

    greenIndicator: {
      width: 9,

      height: 9,

      borderRadius: 5,

      backgroundColor:
        COLORS.primary,

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,

        height: 0,
      },

      shadowOpacity: 0.7,

      shadowRadius: 5,

      elevation: 3,
    },

    addressIcon: {
      width: 39,

      height: 39,

      borderRadius: 20,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent:
        "center",
    },


    /*
    ========================================================
    AVATAR
    ========================================================
    */

    avatarContainer: {
      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 3,

      borderColor:
        COLORS.primary,

      justifyContent:
        "center",

      alignItems: "center",

      marginBottom: 9,

      position: "relative",

      overflow: "visible",
    },

    avatarImage: {
      resizeMode: "cover",
    },

    avatarPlaceholder: {
      backgroundColor:
        COLORS.surfaceDarkAlt,

      justifyContent:
        "center",

      alignItems: "center",
    },

    avatarOverlay: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        "rgba(0,0,0,0.65)",

      justifyContent:
        "center",

      alignItems: "center",
    },

    editBadge: {
      position: "absolute",

      right: -4,

      bottom: -3,

      backgroundColor:
        COLORS.primary,

      justifyContent:
        "center",

      alignItems: "center",

      borderWidth: 2,

      borderColor:
        COLORS.surfaceDark,

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity: 0.3,

      shadowRadius: 3,

      elevation: 4,
    },

    avatarHint: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginBottom: 2,
    },


    /*
    ========================================================
    LABEL
    ========================================================
    */

    label: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.textSecondary,

      marginTop: 13,

      marginBottom: 6,
    },


    /*
    ========================================================
    INPUT
    ========================================================
    */

    inputWrapper: {
      minHeight: 49,

      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 10,

      paddingHorizontal: 12,
    },

    input: {
      flex: 1,

      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textPrimary,

      paddingVertical: 9,

      marginLeft: 9,

      minWidth: 0,
    },

    streetInput: {
      alignItems:
        "flex-start",

      paddingTop: 3,
    },


    /*
    ========================================================
    SELECT
    ========================================================
    */

    selectBtn: {
      minHeight: 49,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 10,

      paddingHorizontal: 12,
    },

    disabledSelect: {
      opacity: 0.42,
    },

    selectLeft: {
      flexDirection: "row",

      alignItems: "center",

      flex: 1,

      minWidth: 0,
    },

    selectText: {
      fontFamily:
        "Poppins_400Regular",

      marginLeft: 9,

      flex: 1,
    },


    /*
    ========================================================
    ADDRESS PREVIEW
    ========================================================
    */

    addressPreview: {
      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "rgba(142, 255, 0, 0.07)",

      borderWidth: 1,

      borderColor:
        "rgba(142, 255, 0, 0.22)",

      borderRadius: 11,

      padding: 10,

      marginTop: 15,
    },

    addressPreviewIcon: {
      width: 32,

      height: 32,

      borderRadius: 16,

      backgroundColor:
        "rgba(142, 255, 0, 0.12)",

      alignItems: "center",

      justifyContent:
        "center",

      marginRight: 9,
    },

    addressPreviewContent: {
      flex: 1,
    },

    addressPreviewLabel: {
      fontFamily:
        "Poppins_600SemiBold",

      fontSize: 7.5,

      color:
        COLORS.primary,

      letterSpacing: 1,

      marginBottom: 2,
    },

    addressPreviewText: {
      fontFamily:
        "Poppins_400Regular",

      fontSize: 9.5,

      color:
        COLORS.textSecondary,

      lineHeight: 15,
    },


    /*
    ========================================================
    SAVE BUTTON
    ========================================================
    */

    saveBtn: {
      backgroundColor:
        COLORS.primary,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      marginTop: 1,

      marginBottom: 17,

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,

        height: 4,
      },

      shadowOpacity: 0.2,

      shadowRadius: 8,

      elevation: 4,
    },

    saveBtnDisabled: {
      opacity: 0.7,
    },

    saveBtnText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textDark,

      marginLeft: 7,
    },


    /*
    ========================================================
    FOOTER
    ========================================================
    */

    footer: {
      alignItems: "center",

      justifyContent:
        "center",

      paddingTop: 4,

      paddingBottom: 8,
    },

    footerLogo: {
      opacity: 0.85,

      marginBottom: 5,
    },

    footerLine: {
      width: 38,

      height: 2,

      borderRadius: 2,

      backgroundColor:
        COLORS.primary,

      marginBottom: 5,
    },

    footerText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      letterSpacing: 1,
    },


    /*
    ========================================================
    MODAL
    ========================================================
    */

    modalOverlay: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.72)",

      justifyContent:
        "flex-end",
    },

    modalContent: {
      backgroundColor:
        COLORS.surfaceDark,

      borderTopLeftRadius: 22,

      borderTopRightRadius: 22,

      height: "72%",

      paddingHorizontal: 16,

      paddingTop: 17,

      borderTopWidth: 2,

      borderTopColor:
        COLORS.primary,
    },

    modalHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginBottom: 9,
    },

    modalEyebrow: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.primary,

      fontSize: 8,

      letterSpacing: 1.2,
    },

    modalTitle: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 19,

      color:
        COLORS.textPrimary,

      marginTop: 1,
    },

    closeBtn: {
      width: 38,

      height: 38,

      borderRadius: 19,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent:
        "center",
    },

    modalAccentLine: {
      height: 3,

      width: 55,

      flexDirection: "row",

      marginBottom: 13,

      borderRadius: 3,

      overflow: "hidden",
    },

    modalAccentPart: {
      flex: 1,
    },

    modalItem: {
      minHeight: 56,

      flexDirection: "row",

      alignItems: "center",

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,

      paddingVertical: 7,
    },

    modalItemIcon: {
      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent:
        "center",

      marginRight: 10,
    },

    modalItemText: {
      flex: 1,

      fontFamily:
        "Poppins_500Medium",

      fontSize: 12,

      color:
        COLORS.textPrimary,
    },

    emptyModal: {
      alignItems: "center",

      justifyContent:
        "center",

      paddingTop: 70,
    },

    emptyModalText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      fontSize: 11,

      marginTop: 8,
    },
  });