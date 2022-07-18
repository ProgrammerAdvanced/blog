---
title: Kafka 生产者写入数据
sidebar: zzx
---
## 一、生产者发送消息的步骤
<div align="center">
    <img src=./image/producerRecord.png />
</div>
创建一个 ProducerRecord 对象，对象中包含目标主题和要发送的内容。还可以指定键或分区。在发送 ProducerRecord 对象时，生产者要先把键和值对象序列化成字节数组，这样它们才能够在网络上传输。接下来，数据被传给分区器。分区器直接把指定的分区返回。如果没有指定分区，分区器会根据 ProducerRecord 对象的键来选择一个分区。选择好分区之后，生产者就知道该往哪个这主题和分区发送这条记录了。接着，这条记录被添加到一个记录批次里（Segment），这个批次里的所有消息会被发送到相同的主题和分区上。有一个独立的线程负责把这些记录批次发送到相应的 Broker 上。服务器在收到这些消息时会返回一个响应。如果消息成功写入 Kafka，就返回一个 RecordMetaData 对象，它包含了主题和分区信息，以及记录在分区里的偏移量。如果写入失败，则会返回一个错误。生产者在收到错误之后会尝试重新发送消息，几次之后如果还是失败，就会返回错误信息。命令行创建Topic。

``` shell
#创建Topic
[root@hadoop1 kafka_2.11-2.2.2]# bin/kafka-topics.sh --create --zookeeper hadoop1:2181 --topic sensor --replication-factor 2 --partitions 4
#生产者生产消息
[root@hadoop1 kafka_2.11-2.2.2]# bin/kafka-console-producer.sh --broker-list 192.168.203.132:9092 --topic sensor
```
上面是一个比较简单的流程，如果说更复杂一点的话，如下：KafkaProducer 在将消息序列化和计算分区之前会调用生产者拦截器的 onSend() 方法来对消息进行相应的定制化操作。然后生产者需要用序列化器（Serializer）把对象转换成字节数组才能通过网络发送给 Kafka。最后可能会被发往分区器为消息分配分区。
<div align="center">
    <img src=./image/onSend.png />
</div>

## 二、创建 Kafka 生产者
往 Kafka 写入消息，首先要创建一个生产者对象，并设置一些属性。Kafka 生产者有 3 个必须的属性：
【1】bootstrap.servers：指定 broker 的地址清单，地址的格式为 host:port。清单里不需要包含所有的 broker 地址，生产者会从给定的 broker 里查找到其他 broker 的信息。不过建议至少要提供两个 broker 的信息，一旦其中一个宕机，生产者仍然能够连接到集群上。  
【2】key.serializer：broker 希望接收到的键和值都是字节数组。生产者接口允许使用参数化类型，因此可以把 Java 对象作为键和值发送给 broker。这样的代码具有量化的可读性，不过生产者需要知道如何把这些 Java 对象转换成字节数组。key.serializer 必须被设置为一个实现了 Serializer 接口的类，生产者会使用这个类把键对象序列化成字节数组。Kafka 客户端默认提供了 ByteArraySerializer、StringSerializer、IntegerSerializer，因此，如果只使用常见的几种 Java 对象类型，那么就没有必须实现自己的序列化器，需要注意，key.serializer 是必须设置的，就算打算只发送值内容。  
【3】value.serializer：与 key.serializer 一样，value.serializer 指定的类会将值序列化。如果键和值都是字符串，可以使用与 key.serializer 一样的序列化器。  
【代码演示】：创建一个新的生产者，这里只指定了必要的属性，其他使用默认设置：

``` java
//1、创建一个 Properties 对象
private  Properties kafkaProps = new Properties();
//2、定义必须的三个属性
kafkaProps.put("bootstrap.servers","broker1:9092,broler2:9092");
kafkaProps.put("key.serializer","org.apache.kafka.common.serialization.StringSerializer");
kafkaProps.put("value.serializer","org.apache.kafka.common.serialization.StringSerializer");
//3、创建一个新的生产者对象，并为键和值设置恰当的类型
producer = new KafkaProducer<String,String>(kafkaProps);
```
发送消息主要有以下3种方式：实例化生产者对象后，就可以发送消息了。  
【1】发送并忘记（fire-and-forget）：ack=0 把消息发送给服务器，但不关心它是否正常送达。大多数情况下，消息会正常到达，因为 Kafka 是高可用的，而且生产者会自动尝试重发。不过，使用这种方式有时候也会丢失一些消息。  
【2】同步发送：使用 send() 发送消息，会返回一个 Future 对象，调用 get() 方法进行等待，就可以知道消息是否发送成功。  
【3】异步发送：调用 send() 发送消息，并指定一个回调函数，服务器在返回响应时调用该函数。  
## 三、发送消息到 Kafka
最简单的消息发送方式如下所示：
``` java
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry","Precision Products","France");
try {
    producer.send(record);
}catch (Exception e){
    e.printStackTrace();
}
```
【1】生产者的 send() 方法将 ProducerRecord 对象作为参数，所以我们要先创建一个 ProducerRecord 对象。ProducerRecord  有多个构造函数，这里使用其中一个构造函数，分别是目标主题的名字和发送的键和值对象，他们都是字符串，键和值对象的类型必须与序列化器和生产者对象相匹配。  
【2】使用生产者的 send() 方法发送 ProducerRecord 对象。消息先被放进缓冲区，然后使用单独的线程发送到服务器端。send() 方法会返回一个包含 RecordMetadata 的 Future 对象，不过因为我们忽略了返回值，所以无法知道消息是否发送成功。如果不关心发送结果，可以使用这种方式。比如，记录不太重要的应用程序日志等。  
【3】我们可以忽略发送消息时可能发生的错误或在服务器端可能发生的错误，但在发送消息之前，生产者还是有可能发生其他异常。这些异常可能是 SerializationException、BufferExhaustedException 或 TimeoutException（说明缓冲区已满），又或者是 InterruptException（说明发送线程被中断）。  
## 四、同步发送消息
最简单的消息发送方式如下所示：
``` java
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry","Precision Products","France");
try {
    // get() 方法会阻塞线程，获取返回值
    producer.send(record).get();
}catch (Exception e){
    e.printStackTrace();
}
```

Kafka 生产者写入数据
程序猿进阶
于 2021-04-22 23:27:46 发布 972
收藏 4
分类专栏： 消息中间件Kafka/RabbitMQ/ActiveMQ 文章标签： kafka java
编辑 版权
消息中间件Kafka/RabbitMQ/ActiveMQ 专栏收录该内容
17 篇文章 3 订阅
一、生产者发送消息的步骤


创建一个 ProducerRecord 对象，对象中包含目标主题和要发送的内容。还可以指定键或分区。在发送 ProducerRecord 对象时，生产者要先把键和值对象序列化成字节数组，这样它们才能够在网络上传输。接下来，数据被传给分区器。分区器直接把指定的分区返回。如果没有指定分区，分区器会根据 ProducerRecord 对象的键来选择一个分区。选择好分区之后，生产者就知道该往哪个这主题和分区发送这条记录了。接着，这条记录被添加到一个记录批次里（Segment），这个批次里的所有消息会被发送到相同的主题和分区上。有一个独立的线程负责把这些记录批次发送到相应的 Broker 上。服务器在收到这些消息时会返回一个响应。如果消息成功写入 Kafka，就返回一个 RecordMetaData 对象，它包含了主题和分区信息，以及记录在分区里的偏移量。如果写入失败，则会返回一个错误。生产者在收到错误之后会尝试重新发送消息，几次之后如果还是失败，就会返回错误信息。命令行创建Topic
``` shell
#创建Topic
[root@hadoop1 kafka_2.11-2.2.2]# bin/kafka-topics.sh --create --zookeeper hadoop1:2181 --topic sensor --replication-factor 2 --partitions 4
#生产者生产消息
[root@hadoop1 kafka_2.11-2.2.2]# bin/kafka-console-producer.sh --broker-list 192.168.203.132:9092 --topic sensor
```
上面是一个比较简单的流程，如果说更复杂一点的话，如下：KafkaProducer 在将消息序列化和计算分区之前会调用生产者拦截器的 onSend() 方法来对消息进行相应的定制化操作。然后生产者需要用序列化器（Serializer）把对象转换成字节数组才能通过网络发送给 Kafka。最后可能会被发往分区器为消息分配分区。
二、创建 Kafka 生产者

往 Kafka 写入消息，首先要创建一个生产者对象，并设置一些属性。Kafka 生产者有 3 个必须的属性：
【1】bootstrap.servers：指定 broker 的地址清单，地址的格式为 host:port。清单里不需要包含所有的 broker 地址，生产者会从给定的 broker 里查找到其他 broker 的信息。不过建议至少要提供两个 broker 的信息，一旦其中一个宕机，生产者仍然能够连接到集群上。
【2】key.serializer：broker 希望接收到的键和值都是字节数组。生产者接口允许使用参数化类型，因此可以把 Java 对象作为键和值发送给 broker。这样的代码具有量化的可读性，不过生产者需要知道如何把这些 Java 对象转换成字节数组。key.serializer 必须被设置为一个实现了 Serializer 接口的类，生产者会使用这个类把键对象序列化成字节数组。Kafka 客户端默认提供了 ByteArraySerializer、StringSerializer、IntegerSerializer，因此，如果只使用常见的几种 Java 对象类型，那么就没有必须实现自己的序列化器，需要注意，key.serializer 是必须设置的，就算打算只发送值内容。
【3】value.serializer：与 key.serializer 一样，value.serializer 指定的类会将值序列化。如果键和值都是字符串，可以使用与 key.serializer 一样的序列化器。
【代码演示】：创建一个新的生产者，这里只指定了必要的属性，其他使用默认设置：
``` java
//1、创建一个 Properties 对象
private  Properties kafkaProps = new Properties();
//2、定义必须的三个属性
kafkaProps.put("bootstrap.servers","broker1:9092,broler2:9092");
kafkaProps.put("key.serializer","org.apache.kafka.common.serialization.StringSerializer");
kafkaProps.put("value.serializer","org.apache.kafka.common.serialization.StringSerializer");
//3、创建一个新的生产者对象，并为键和值设置恰当的类型
producer = new KafkaProducer<String,String>(kafkaProps);
```
发送消息主要有以下3种方式：实例化生产者对象后，就可以发送消息了。
【1】发送并忘记（fire-and-forget）：ack=0 把消息发送给服务器，但不关心它是否正常送达。大多数情况下，消息会正常到达，因为 Kafka 是高可用的，而且生产者会自动尝试重发。不过，使用这种方式有时候也会丢失一些消息。
【2】同步发送：使用 send() 发送消息，会返回一个 Future 对象，调用 get() 方法进行等待，就可以知道消息是否发送成功。
【3】异步发送：调用 send() 发送消息，并指定一个回调函数，服务器在返回响应时调用该函数。
三、发送消息到 Kafka

最简单的消息发送方式如下所示：
``` java
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry","Precision Products","France");
try {
    producer.send(record);
}catch (Exception e){
    e.printStackTrace();
}
```
【1】生产者的 send() 方法将 ProducerRecord 对象作为参数，所以我们要先创建一个 ProducerRecord 对象。ProducerRecord  有多个构造函数，这里使用其中一个构造函数，分别是目标主题的名字和发送的键和值对象，他们都是字符串，键和值对象的类型必须与序列化器和生产者对象相匹配。
【2】使用生产者的 send() 方法发送 ProducerRecord 对象。消息先被放进缓冲区，然后使用单独的线程发送到服务器端。send() 方法会返回一个包含 RecordMetadata 的 Future 对象，不过因为我们忽略了返回值，所以无法知道消息是否发送成功。如果不关心发送结果，可以使用这种方式。比如，记录不太重要的应用程序日志等。
【3】我们可以忽略发送消息时可能发生的错误或在服务器端可能发生的错误，但在发送消息之前，生产者还是有可能发生其他异常。这些异常可能是 SerializationException、BufferExhaustedException 或 TimeoutException（说明缓冲区已满），又或者是 InterruptException（说明发送线程被中断）。
四、同步发送消息

最简单的消息发送方式如下所示：
``` java
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry","Precision Products","France");
try {
    // get() 方法会阻塞线程，获取返回值
    producer.send(record).get();
}catch (Exception e){
    e.printStackTrace();
}
```
【1】producer.send() 方法会返回一个 Future 对象，然后调用 Future 对象的 get() 方法等待 Kafka 响应。如果服务器返回错误，get() 方法会抛出异常。如果没有发生错误，会得到一个 RecordMetadata 对象，可以用它获取消息的偏移量。  
【2】如果在发送数据之前或者在发送过程中发生了任何错误，比如 broker 返回一个不允许重复发送消息的异常或者已经超时了重发次数，那么就会抛出异常。  

KafkaProducer 一般会发生两类错误。其中一类是可重试错误，可通过重发消息来解决。比如连接错误，可以通过再次建立连接来解决，no Leader 错误则可以通过重新为分区选举 Leader 来解决。 KafkaProducer 可以被配置称自动重试，如果在多次重试后仍无法解决问题，应用程序会收到一个重试异常。另一类错误无法通过重试解决，比如“消息太大”异常。对于这类错误，KafkaProducer 不会进行任何重试，直接抛出异常。
## 五、异步发送消息
假设消息在应用程序和 Kafka 集群之间来回需要 10ms。如果使用同步发送消息，那么发送 100个消息需要1秒。但如果只发送消息不等待响应，那么发送100个消息需要的时间会少很多。大多数时候，我们并不需要等待响应。尽管 Kafka 会把目标主题、分区信息和消息的偏移量发送回来，但对于发送端的应用程序来说不是必须的。不过在遇到消息发送失败时，需要抛出异常，记录错误日志，或者把消息写入“错误消息”文件以便日后分析。
``` java
// 实现 Callback 接口
private class DemoProducerCallback implements Callback{
    @Override
    public void onCompletion(RecordMetadata recoredMetadata,Exception e){
        if(e != null){
            e.printStackTrace();
        }
    }
}
 
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry","Precision Products","France");
producer.send(record,new DemoProducerCallback);
```
【1】为了使用回调，需要一个实现了 org.apache.kafka.clients.producer.Callback 接口的类，这个接口只有一个 onCompletion 方法。  
【2】如果 Kafka 返回一个错误，onCompletion 方法会抛出一个非空（non null）异常。这里我们只是简单地把它打印出来，但是在生产环境应该有更好的处理方式。  
【3】在发送消息时传入定义的回调对象。  
## 六、生产者的配置
生产者还有很多可配置的参数，在 Kafka 文档中有说明，它们大部分都有合理的默认值，所以没有必须去修改它们，不过有个几个参数在内存使用、性能和可靠性方面对生产者影响比较大。下面就进行简单说明：  
【1】acks：指定了必须要有多少个分区副本收到消息，生产者才会认为消息写入是成功的。这个参数对消息丢失的可能性有重要影响。该参数有如下选项：  
   ■  如果 acks=0 生产者在成功写入消息之前不会等待任何来自服务器的响应。如果当中出现了问题，导致服务器没有收到消息，消息也就丢失了。但也因为不需要等待服务器的响应，所以它可以以网络能够支持的最大速度发送消息，从而达到很高的吞吐量。  
   ■  如果 acks=1 只要集群的首领节点收到消息，生产者会收到一个来自服务器的成功响应。如果消息无法到达首领节点（比如首领节点崩溃，新的首领还没选举出来）生产者收到一个错误响应，为了避免数据丢失，生产者会重发消息。不过，如果一个没有收到消息的节点成为新首领，消息还是会丢失。这个时候的吞吐量取决于使用的是同步发送还是异步发送。如果让发送端等待服务器的响应，显然会增加延迟。如果使用回调，延迟问题就可以得到缓解，不过吞吐量还是会发送中消息数量的限制（比如，生产者在收到服务器响应之前可以发送对少个消息）。  
   ■  如果 ack=all/-1 只有当 ISR 中的所有节点全部收到消息时，生产者才会收到一个来自服务器的成功响应。这种模式是最安全的，它可以保证不止一个服务器收到消息，就算有服务器发生崩溃，整个集群仍然可以运行。不过，它的延迟比 acks=1 时更高，因为我们要等待不止一个服务器节点接收消息。    
【2】buffer.memory：用来设置生产者内存缓冲区的大小，用来缓冲发送到服务器的消息。如果应用程序发送消息到缓冲区的速度>缓冲区消息发送到服务器的速度。会导致生产者空间不足。这个时候 send() 方法会被阻塞，或者抛出异常，取决于设置最大阻塞时间。  
【3】compression.type：默认消息不压缩，该参数可以设置为 snappy、gzip 或 lz4，指定了消息被发送给 broker之前使用哪一种压缩算法进行压缩。snappy 压缩算法由 Google 发明，占用比较少的 CPU，却能提供较好的性能和相当可观的压缩比，如果关注性能和网络宽带，可以使用这种算法。gzip 算法一般会占用较多的 CPU，但会提供更高的压缩比，如果网络宽带比较有限，可以使用这种算法。使用压缩可以降低网络传输开销和存储开销，而这往往是向 Kafka 发送消息的瓶颈所在。  
【4】retries：生产者从服务器收到的错误可能是临时性的错误（例如分区找不到首领），retries 参数的值决定了生产者可以重发消息的次数，如果达到这个次数，生产者会放弃重试并返回错误。默认情况下，生产者会在每次重试之间等待 100ms，可以通过 retry.backoff.ms 参数来改变这个时间间隔。建议在设置每次重试次数和重试时间间隔前，先测试一下恢复一个节点需要的时间。让总的重试时间比 Kafka 集群从崩溃中恢复的时间长，否则生产者会过早放弃重试。但有些错误不是临时性的，没办法通过重试来解决（比如“消息太大”错误）。所以就没必要在代码逻辑里处理那些可重试的错误。只需要处理那些不可重试的错误或重试次数超出上限的情况。  
【5】batch.size：当有多个消息需要被发送到同一个分区时，生产者会把它们放在同一个批次里。该参数指定了一个批次可以使用的内存大小，按照字节数计算。当批次被填满，批次里的所有消息会被发送出去。不过生产者并不一定都会等到批次被填满了才发送，半满的批次，甚至只有一个消息的批次也有可能发送，所以就算批次大小设置的很大，也不会造成延迟，只是会占用更多的内存而已。但如果设置的过小，因为生产者频繁地发送消息，会增加一些额外的开销。  
【6】linger.ms：指定生产者在发送批次之前等待更多消息加入批次的时间。kafkaProducer 会在批次填满或 linger.ms 达到上限时把批次发送出去。  
【7】client.id：该参数可以是任意的字符串，服务器会用它识别消息的来源，还可以用在日志和配额指标里。  
【8】max.in.flight.requests.per.connection：指定了生产者在收到服务器响应之前可以发送多少个消息。它的值越高，就会占用越多的内存，不过也会提高吞吐量。把它设为1可以保证消息是按照发送的顺序写入服务器的，即使发送了重试。  
【9】timeout.ms、request.timeout.ms 和 metadata.fetch.timeout.ms：request.timeout.ms 指定了生产者发送数据时等待服务器返回响应的时间，metadata.fetch.timeout.ms 指定了生产者在获取元数据时等待服务器返回响应的时间。如果等待超时，那么生产者要么重试发送，要么返回一个错误。timeout.ms 指定了 broker 等待同步副本返回消息确认的时间，与 acks 的配置相匹配，如果没有在指定时间收到同步副本的确认，那么broker 就会返回一个错误。  
【10】max.block.ms：指定了在调用 send() 方法或使用 partitionsFor() 方法获取元数据时生产者的阻塞时间。当生产者的发送缓冲区已满，或者没有可用的元数据时，这些方法就会阻塞。在阻塞时间达到 max.block.ms 时，生产者会抛出超时异常。  
【11】max.request.size：用于控制生产者发送的请求大小。它可以指能发送的单个消息的最大值，也可以指单个请求里所有消息总的大小。例如，假设这个值为 1MB，或者生产者可以在单个请求里发一个批次，该批次有100个消息，每个消息大小为10KB，另外，broker 对可接收的消息最大值也有自己的限制（message.max.bytes）所有两边的配置最好匹配，避免生产者发送的消息被 broker 拒接。  
【12】receive.buffer.bytes 和 send.buffer.bytes：分别指 TCP socket 接收和发送数据包的缓冲区大小。如果设置为-1，就是用操作使用的默认值，因为跨数据中心的网络一般都有比较高的延迟和比较低的宽带。
## 七、序列化器

创建一个生产者对象必须指定序列化器。Kafka 提供了整型和字节数组序列化器。不过它们还不能满足大部分场景的需求。我们需要开发自己的序列化器。
【1】自定义序列化器：如果发送的对象不是简单的整型或字符串，可以使用序列化框架 Avro、Thrift、Protobuf，或者自定义序列化器。建议使用通用的序列化框架。为了了解序列化器的工作原理，也为了说明为什么要使用序列化框架，下面自定义一个序列化器：
``` java
// 创建一个简单的类来表示一个客户
public class Customer {
    private int customerID;
    private String customerName;
    
    public Customer(int ID,String name) {
        this.customerID = ID;
        this.customerName = name;
    }
    
    public int getID() {
        return customerID;
    }
    
    public String getName() {
        return customerName;
    }
}
    
//现在为这个类创建序列化器
//只要使用这个 CustomerSerializer，就可以把消息记录定义成 ProducerRecord<String，Customer>，
//并且可以直接把 Customer 对象传给生产者。在创建 KafkaProducer 的时候传入
import org.apache.kafka.common.errors.SerializationException
public class CustomerSerializer implements Serializer<Customer> {
    @Override
    public void configure(Map configs, boolean isKey) {
        //不做任何配置
    }
    
    /**
        * Customer 对象被序列化成：
        *    表示 customerID 的4字节整数
        *    表示 customerName 长度的 4 字节整数（如果 customerName 为空，则长度为 0）
        *    表示 customerName 的N个字节
        */
    @Override
    public byte[] serialize(String topic, Customer data) {
        try {
            byte[] serializedName;
            int stringSize;
            if(data == null) return null;
            else {
                if(data.getName() != null) {
                    serializedName = data.getName().getBytes("UTF-8");
                    stringSize = serializedName.length;
                }else {
                    serializedName = new byte[0];
                    stringSize = 0;
                }
            }
            
            ByteBuffer buffer = ByteBuffer.allocate(4+4+stringSize);
            buffer.putInt(data.getID());
            buffer.putInt(stringSize);
            buffer.put(serializedName);
    
            //用array()方法获取底层byte[]
            return buffer.array();
        }
    }
    
    @Override
    public void close() {
        //不需要关闭任何东西
    } catch (Exception e) {
        throw new SerializationException("Error when serializing Customer to byte[]"+e);
    }
}
```
【2】Thrift 序列化框架的使用：链接
## 八、分区

ProducerRecord 对象包含了目标主题、键和值。Kafka 的消息时一个个键值对，ProducerRecord  对象可以只包含目标主题和值，键可以设置为默认的null，不过大多数的应用程序会用到键。键的用途有两个：可以作为消息的附加信息，也可以用来决定消息该被写到主题的那个分区。拥有相同键的消息被写到同一个分区。如果一个进程只从一个主题的分区读取数据，那么具有相同键的所有记录都会被该进程读取。如下：创建一个包含键值的记录：
``` java
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry","Precision Products","France");
//如果要创建一个键为null的消息，不指定键就可以了
ProducerRecord<String, String> record = new ProducerRecord<>("CustomerCountry","France");
```
如果键为null，且使用了默认的分区器，那么记录将被随机地发送到主题内各个可用的分区上。分区器使用轮序（Round Robin）算法将消息均衡地分布到各个分区上。如果键不为空，并且使用了默认分区器，那么 Kafka 会对键进行散列（使用Kafka 自己的算法）然后根据散列值把消息映射到特定的分区上。这里的关键之处在于，同一个键总是被映射到同一个分区上。所以在进行映射时，我们会使用主题所有的分区，而不仅仅是可用的分区。意味着，写入数据的分区时不可用的，那么就会发生错误。但这种情况很少出现，以为分区具有复制功能和可用性。

只有在不改变主题分区数量的情况下，键与分区之间的映射才能保持不变。例如：在分区数量保持不变的情况下，可以保证用户zzx 的记录总是被写到 Partition_3。在从分区读数据时，可以进行各种优化。一旦主题增加了新的分区，这些就无法保证了，旧数据仍然留在分区3，但新记录可能被写到其他分区上。如果要使用键来映射分区，最好在创建主题的时候就把分区规划好，而且永远不要增加新分区。

【实现自定义分区策略】：默认分区器是使用次数最多的分区器。不过，除了散列分区之外，有时候也需要对数据进行不一样的分区。代码如下：
``` java
public class myPartitioner implements Partitioner {
    //Partitioner 接口包含了 configure、partition 和 close 三个方法，这里只实现 partition 方法
    public void configure(Map<String,?> configs){}
    public int partition(String topic, Object key, byte[] keyBytes, Object value,byte[] valueBytes, Cluster cluster){
        List<partitionInfo> partitions = cluster.partitonsForTopic(topic);
        int numPartitions = partitions.size();
        
        //.....业务处理
    }
    public void close(){}
}
```