// Email HTML Templates

export const emailTemplates = {
  // Order Received
  order_received: {
    subject: 'Siparişiniz Alındı - {{orderNumber}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sipariş Alındı</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Siparişiniz Alındı!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px;">Merhaba {{customerName}},</p>
              <p style="font-size: 16px; color: #333; margin: 0 0 30px;">Siparişiniz başarıyla alındı ve hazırlanmaya başlandı.</p>
              
              <!-- Order Info -->
              <table width="100%" cellpadding="10" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="font-size: 14px; color: #666;">Sipariş Numarası:</td>
                  <td style="font-size: 14px; color: #333; font-weight: bold; text-align: right;">{{orderNumber}}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666;">Sipariş Tarihi:</td>
                  <td style="font-size: 14px; color: #333; text-align: right;">{{orderDate}}</td>
                </tr>
              </table>
              
              <!-- Order Total -->
              <table width="100%" cellpadding="10" style="border-top: 2px solid #e0e0e0; margin-top: 20px;">
                <tr>
                  <td style="font-size: 14px; color: #666;">Ara Toplam:</td>
                  <td style="font-size: 14px; color: #333; text-align: right;">₺{{subtotal}}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666;">Kargo:</td>
                  <td style="font-size: 14px; color: #333; text-align: right;">₺{{shippingCost}}</td>
                </tr>
                <tr style="border-top: 2px solid #e0e0e0;">
                  <td style="font-size: 18px; color: #333; font-weight: bold; padding-top: 15px;">Toplam:</td>
                  <td style="font-size: 18px; color: #667eea; font-weight: bold; text-align: right; padding-top: 15px;">₺{{total}}</td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #666; margin: 30px 0 0;">Siparişiniz hazırlandığında size bilgi vereceğiz.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">© 2026 Woontegra. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  },

  // Order Shipped
  order_shipped: {
    subject: 'Siparişiniz Kargoya Verildi - {{orderNumber}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kargoya Verildi</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚚 Siparişiniz Kargoda!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px;">Merhaba {{customerName}},</p>
              <p style="font-size: 16px; color: #333; margin: 0 0 30px;">Siparişiniz kargoya verildi ve yakında size ulaşacak.</p>
              
              <!-- Tracking Info -->
              <table width="100%" cellpadding="15" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="font-size: 14px; color: #666;">Sipariş Numarası:</td>
                  <td style="font-size: 14px; color: #333; font-weight: bold; text-align: right;">{{orderNumber}}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666;">Kargo Firması:</td>
                  <td style="font-size: 14px; color: #333; text-align: right;">{{shippingCompany}}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666;">Takip Numarası:</td>
                  <td style="font-size: 14px; color: #667eea; font-weight: bold; text-align: right;">{{trackingNumber}}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666;">Tahmini Teslimat:</td>
                  <td style="font-size: 14px; color: #333; text-align: right;">{{estimatedDelivery}}</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{trackingUrl}}" style="display: inline-block; padding: 15px 40px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Kargonu Takip Et
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">© 2026 Woontegra. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  },

  // Coupon Created
  coupon_created: {
    subject: 'Özel Kupon Kodunuz: {{couponCode}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kupon Kodu</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎁 Özel Kupon Kodunuz!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="font-size: 16px; color: #333; margin: 0 0 30px;">Size özel bir kupon kodu hazırladık!</p>
              
              <!-- Coupon Code -->
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; margin: 30px 0;">
                <p style="font-size: 14px; color: #ffffff; margin: 0 0 10px; opacity: 0.9;">KUPON KODUNUZ</p>
                <p style="font-size: 32px; color: #ffffff; margin: 0; font-weight: bold; letter-spacing: 3px;">{{couponCode}}</p>
              </div>
              
              <!-- Coupon Details -->
              <table width="100%" cellpadding="10" style="background-color: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="font-size: 14px; color: #666;">{{discountType}}:</td>
                  <td style="font-size: 14px; color: #f5576c; font-weight: bold; text-align: right;">{{discountValue}}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666;">Minimum Sepet:</td>
                  <td style="font-size: 14px; color: #333; text-align: right;">{{minCartTotal}}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666;">Son Kullanma:</td>
                  <td style="font-size: 14px; color: #333; text-align: right;">{{expiryDate}}</td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #666; margin: 20px 0;">Alışverişinizde bu kodu kullanarak indirimden faydalanabilirsiniz.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">© 2026 Woontegra. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  },

  // Abandoned Cart
  abandoned_cart: {
    subject: 'Sepetiniz Sizi Bekliyor! 🛒',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sepetiniz Bekliyor</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🛒 Sepetiniz Sizi Bekliyor!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px;">Merhaba,</p>
              <p style="font-size: 16px; color: #333; margin: 0 0 30px;">Sepetinizde bıraktığınız ürünler hala sizi bekliyor.</p>
              
              <!-- Cart Total -->
              <table width="100%" cellpadding="15" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="font-size: 18px; color: #333; font-weight: bold;">Sepet Toplamı:</td>
                  <td style="font-size: 24px; color: #667eea; font-weight: bold; text-align: right;">₺{{total}}</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{recoveryUrl}}" style="display: inline-block; padding: 15px 40px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Alışverişi Tamamla
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 12px; color: #999; margin: 30px 0 0; text-align: center;">Bu sepet {{expiresIn}} içinde geçerliliğini yitirecek.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">© 2026 Woontegra. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  },
};
