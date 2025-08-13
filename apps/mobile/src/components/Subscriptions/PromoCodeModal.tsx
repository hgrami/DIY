import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Keyboard, ScrollView, Text, TextInput, View, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { CustomBottomSheet } from "../CustomBottomSheet";

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
                <TouchableOpacity
                    style={[styles.bottomSheetButton, styles.bottomSheetCancelButton]}
                    onPress={handleClose}
                    disabled={redeemingPromo}
                >
                    <Text style={styles.bottomSheetCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.bottomSheetButton, styles.redeemSubmitButton]}
                    onPress={handlePromoCodeSubmit}
                    disabled={redeemingPromo || !promoCode.trim()}
                >
                    {redeemingPromo ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.redeemSubmitButtonText}>Redeem</Text>
                    )}
                </TouchableOpacity>
            </View>
        );

        return (
            <CustomBottomSheet
                visible={isVisible}
                onClose={handleClose}
                title="Redeem Promo Code"
                description="Enter your promo code to unlock premium features or lifetime access."
                snapPoints={["55%", "75%", "90%"]}
                footer={footer}
            >
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
            </CustomBottomSheet>
        );
    }
);

const styles = StyleSheet.create({
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
    bottomSheetButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    bottomSheetCancelButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    bottomSheetCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    redeemSubmitButton: {
        backgroundColor: '#6366F1',
    },
    redeemSubmitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});