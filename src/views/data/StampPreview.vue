<template>
  <div class="stamp-preview">
    <h2>印章样式预览</h2>
    <p class="subtitle">请选择您喜欢的印章样式</p>
    
    <div class="stamp-grid">
      <div class="stamp-item">
        <div class="stamp-circle">
          <span class="stamp-inner">已审核</span>
        </div>
        <div class="stamp-name">样式1：经典圆形</div>
      </div>
      
      <div class="stamp-item">
        <div class="stamp-square">
          <span class="stamp-inner">已审核</span>
        </div>
        <div class="stamp-name">样式2：方形印章</div>
      </div>
      
      <div class="stamp-item">
        <div class="stamp-ellipse">
          <span class="stamp-inner">已审核</span>
        </div>
        <div class="stamp-name">样式3：椭圆印章</div>
      </div>
      
      <div class="stamp-item">
        <div class="stamp-art">
          <span class="stamp-inner">已审核</span>
        </div>
        <div class="stamp-name">样式4：艺术印章</div>
      </div>
      
      <div class="stamp-item">
        <div class="stamp-vintage">
          <span class="stamp-inner">已审核</span>
        </div>
        <div class="stamp-name">样式5：复古印章</div>
      </div>
    </div>
    
    <div class="selection-info">
      <p>当前使用：<strong>样式1：经典圆形</strong></p>
      <p>如需更换，请告诉我样式编号（1-5）或样式名称</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss">
.stamp-preview {
  padding: 40px;
  background: #F5F7FA;
  min-height: 100vh;
  
  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #344054;
    margin-bottom: 8px;
  }
  
  .subtitle {
    color: #667085;
    margin-bottom: 32px;
  }
  
  .stamp-grid {
    display: flex;
    gap: 40px;
    flex-wrap: wrap;
    margin-bottom: 32px;
  }
  
  .stamp-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  
  .stamp-name {
    font-size: 14px;
    color: #667085;
    text-align: center;
    max-width: 150px;
  }
  
  /* 样式1：经典圆形印章 */
  .stamp-circle {
    width: 56px;
    height: 56px;
    border: 3px solid #E55353;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      width: 44px;
      height: 44px;
      border: 1px dashed #E55353;
      border-radius: 50%;
    }
    
    .stamp-inner {
      font-size: 16px;
      font-weight: bold;
      color: #E55353;
      letter-spacing: 2px;
      line-height: 1;
    }
  }
  
  /* 样式2：方形印章 */
  .stamp-square {
    width: 56px;
    height: 56px;
    border: 3px solid #E55353;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(229, 83, 83, 0.05);
    
    .stamp-inner {
      font-size: 16px;
      font-weight: bold;
      color: #E55353;
      letter-spacing: 2px;
      line-height: 1;
    }
  }
  
  /* 样式3：椭圆印章 */
  .stamp-ellipse {
    width: 68px;
    height: 48px;
    border: 3px solid #E55353;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      width: 56px;
      height: 36px;
      border: 1px dashed #E55353;
      border-radius: 50%;
    }
    
    .stamp-inner {
      font-size: 15px;
      font-weight: bold;
      color: #E55353;
      letter-spacing: 2px;
      line-height: 1;
    }
  }
  
  /* 样式4：艺术印章 */
  .stamp-art {
    width: 58px;
    height: 58px;
    border: 2px solid #E55353;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: radial-gradient(circle, rgba(229, 83, 83, 0.1) 0%, transparent 70%);
    
    &::before {
      content: '★';
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #E55353;
    }
    
    &::after {
      content: '★';
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #E55353;
    }
    
    .stamp-inner {
      font-size: 15px;
      font-weight: bold;
      color: #E55353;
      letter-spacing: 2px;
      line-height: 1;
      margin-top: 4px;
    }
  }
  
  /* 样式5：复古印章 */
  .stamp-vintage {
    width: 56px;
    height: 56px;
    border: 2px double #E55353;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: inset 0 0 0 3px transparent, inset 0 0 0 4px #E55353;
    
    .stamp-inner {
      font-size: 16px;
      font-weight: bold;
      color: #E55353;
      letter-spacing: 2px;
      line-height: 1;
    }
  }
  
  .selection-info {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    p {
      margin: 8px 0;
      color: #667085;
      
      strong {
        color: #344054;
      }
    }
  }
}
</style>