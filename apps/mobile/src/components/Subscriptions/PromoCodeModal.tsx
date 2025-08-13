import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Keyboard, ScrollView, Text, TextInput, View, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { NativeModal } from "../NativeModal";
import { Button } from '../Button';

interface PromoCodeModalProps {
    isVisible: boolean;
    onClose: () => void;
    onRedeem: (code: string) => Promise<void>;
    redeemingPromo?: boolean;
}

export interface PromoCodeModalRef {
    focus: () => void;
}

export const PromoCodeModal = forwardRef<PromoCodeModalRef, PromoCodeModalProps>(
    ({ isVisible, onClose, onRedeem, redeemingPromo = false }, ref) => {
        const [promoCode, setPromoCode] = useState('');
        const promoInputRef = useRef<TextInput>(null);

        // Expose focus method to parent
        useImperativeHandle(ref, () => ({
            focus: () => {
                promoInputRef.current?.focus();
            }
        }));

        const handlePromoCodeSubmit = async () => {
            if (!promoCode.trim()) {
                return;
            }

            Keyboard.dismiss();
            await onRedeem(promoCode.trim());
            setPromoCode('');
        };

        const handleClose = () => {
            setPromoCode('');
            Keyboard.dismiss();
            onClose();
        };

        const footer = (
            <View style={styles.footerRow}>
                <Button
                    title="Cancel"
                    onPress={handleClose}
                    variant="outline"
                    disabled={redeemingPromo}
                    style={{ flex: 1 }}
                />
                <Button
                    title="Redeem"
                    onPress={handlePromoCodeSubmit}
                    variant="primary"
                    disabled={redeemingPromo || !promoCode.trim()}
                    loading={redeemingPromo}
                    style={{ flex: 1 }}
                />
            </View>
        );

        return (
            <NativeModal
                isVisible={isVisible}
                onClose={handleClose}
                title="Redeem Promo Code"
                size="medium"
                allowSwipeToClose={!redeemingPromo}
                footerComponent={footer}
            >
                <View style={styles.container}>
                    <Text style={styles.description}>
                        Enter your promo code to unlock premium features or lifetime access.
                    </Text>
                <TextInput
                    ref={promoInputRef}
                    style={styles.promoInput}
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="Enter promo code..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus={false}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                        Keyboard.dismiss();
                        handlePromoCodeSubmit();
                    }}
                    editable={!redeemingPromo}
                />
                </View>
            </NativeModal>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
    },
    description: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    promoInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#FFFFFF',
        marginBottom: 24,
        textAlign: 'center',
        letterSpacing: 1,
    },
    footerRow: {
        flexDirection: 'row',
        gap: 12,
    },
});