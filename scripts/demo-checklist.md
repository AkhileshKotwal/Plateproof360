# PlateProof 360: 3-minute demo checklist

## Before the demo

1. Find the laptop LAN IPv4 address:

   ```powershell
   ipconfig
   ```

2. In `server/.env`, set:

   ```env
   CLIENT_URL=http://<LAN-IP>:5173
   ```

3. In `client/.env`, set:

   ```env
   VITE_API_URL=http://<LAN-IP>:4000
   ```

4. Start the API:

   ```powershell
   cd server
   npm run db:reset
   npm start
   ```

5. Start the client in a second terminal:

   ```powershell
   cd client
   npm run dev
   ```

6. Connect the phone and laptop to the same Wi-Fi. Open `http://<LAN-IP>:5173`.

## Three-minute sequence

1. Login as **Staff** using a name such as `Akhil`.
2. Open **New order**, choose Paneer Tikka Masala, keep 82°C / 25 minutes, and create the order.
3. Show the QR and explain the recipe-derived allergen chips.
4. Scan the QR with the phone.
5. On the phone, show cooking temperature, hygiene status, and allergen caution.
6. Select **Report a problem**, choose **Undercooked**, add a short note, and submit.
7. On the laptop, open **Dashboard** and select the new Medium incident.
8. Assign it to `Kitchen Team`.
9. Select a photo and click **Mark Fixed**. Show the proof thumbnail in the audit timeline.
10. Try **Verify** while still Staff. The server must reject it with HTTP 403. This demonstrates server-side role enforcement.
11. Use **Switch role**, login as **Supervisor**, open the same incident, and click **Verify**.
12. Click **Close**.
13. Show the audit timeline: Opened, Assigned, Fixed with proof, Verified, Closed.
14. Show the phone status tracker update to **Closed**.
15. If needed, login as Manager and use **Reset demo data** before another run.

## If something breaks

- Check both terminals for startup errors.
- Confirm `CLIENT_URL` is the laptop LAN URL, not `localhost`.
- Confirm `VITE_API_URL` uses the same LAN IP and port 4000.
- Run `ipconfig` again if the Wi-Fi address changed.
- Make sure Windows Firewall allows Node on private networks.
- Confirm the phone and laptop are on the same network; corporate guest Wi-Fi may block device-to-device traffic.
- Reset cleanly:

  ```powershell
  cd server
  npm run db:reset
  ```

- Verify the API independently:

  ```powershell
  npm run test:curl
  ```

