# Sử dụng SDK của Facebook để dựng chat bot phân tích và trả lời tự động, sử dụng làm tổng đài chăm sóc khách hàng của một trang web

## Yêu cầu

-   Cài đặt NodeJS
-   Một tài khoản Facebook
-   Trang Facebook (để nhúng bot này)

## Sử dụng
```
    npm i express node-wit google-spreadsheet moment
```
Tạo một ứng dụng wit và hướng dẫn cho nó hiểu câu nói của bạn
![](src/readme_img/trainbot.png) hãy dạy nó thật nhiều để nó có thể đưa ra các lựa chọn đúng nhất

Triển khai mã muồn này lên ứng dụng Heroku của bạn
Đi tới Ứng dụng dành cho [nhà phát triển Facebook](https://developers.facebook.com/apps/),tạo một app, thêm Sản phẩm Messenger, định cấu hình webhook, (mặc định, url cho webhook là: <liên_kết_herokuapp> / webhook)
    ![](src/readme_img/configwebhook.png)

Tạo một app quản lý trang tính google sheet ([google sheet api](https://console.cloud.google.com/)), tiếp đó tạo một **service account** từ service account đó hãy tạo 1 key định dạng kiểu *json*, mở file đã tải xuống và coppy **PRIVATE_KEY** và **CLIENT_ID** vào file *.env*

Cập nhật biến cấu hình 
    ![](src/readme_img/env.png)
    ```VERIFY_TOKEN=<ma_xac_minh_webhook>```
    ```PAGE_ACCESS_TOKEN=<token_page>```
    ![](src/readme_img/tokenpage.png)
    ```TOKEN_WiT=<token_wit_ai>```
    ![](src/readme_img/wittoken.png)
-   **Hãy nhớ cập nhật các biến cấu hình trên Heroku.**
